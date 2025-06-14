"""Sync prompts and models from LangSmith to local files."""

import os
import re
import json
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from langchain import hub as prompts

# Load environment variables
load_dotenv()

# Mapping of LangSmith prompt names to local configurations
PROMPT_MAPPINGS = {
    "pathlight-summary-generator": {
        "model_class": "SummaryOutput",
        "chain_var": "summary_chain",
        "prompt_var": "summary_prompt"
    },
    "pathlight-full-plan-generator": {
        "model_class": "FullPlanOutput", 
        "chain_var": "full_plan_chain",
        "prompt_var": "full_plan_prompt"
    }
}

def extract_chain_components(chain) -> Dict[str, Any]:
    """Extract prompt, model config, and schema from a LangSmith chain."""
    components = {
        "prompt_template": None,
        "model_config": {},
        "schema": None
    }
    
    try:
        # Get the steps from the chain
        steps = chain.steps if hasattr(chain, 'steps') else []
        
        for i, step in enumerate(steps):
            print(f"Processing step {i}: {type(step)}")
            
            # Extract prompt template (StructuredPrompt)
            if 'StructuredPrompt' in str(type(step)):
                components["prompt_template"] = step
                print(f"Found prompt template in step {i}")
                
            # Extract model configuration and schema (RunnableBinding with ChatOpenAI)
            elif 'RunnableBinding' in str(type(step)) and hasattr(step, 'bound'):
                bound = step.bound
                print(f"Found RunnableBinding in step {i}")
                
                # Get model configuration from bound ChatOpenAI
                if hasattr(bound, 'model_name'):
                    components["model_config"]["model"] = bound.model_name
                if hasattr(bound, 'temperature'):
                    components["model_config"]["temperature"] = bound.temperature
                if hasattr(bound, 'max_tokens'):
                    components["model_config"]["max_tokens"] = bound.max_tokens
                    
                # Look for structured output schema in kwargs
                if hasattr(step, 'kwargs') and 'response_format' in step.kwargs:
                    response_format = step.kwargs['response_format']
                    if isinstance(response_format, dict) and 'json_schema' in response_format:
                        json_schema_info = response_format['json_schema']
                        if 'schema' in json_schema_info:
                            components["schema"] = json_schema_info['schema']
                            print(f"Found JSON schema in step {i}")
                            
    except Exception as e:
        print(f"Error extracting chain components: {e}")
        import traceback
        traceback.print_exc()
        
    return components

def json_schema_to_pydantic(schema: Dict[str, Any], class_name: str) -> str:
    """Convert JSON schema to Pydantic model code."""
    
    def get_python_type(prop_schema: Dict[str, Any]) -> str:
        """Convert JSON schema type to Python type annotation."""
        prop_type = prop_schema.get("type", "str")
        
        if prop_type == "string":
            if "enum" in prop_schema:
                enum_values = ", ".join([f'"{v}"' for v in prop_schema["enum"]])
                return f'Literal[{enum_values}]'
            return "str"
        elif prop_type == "integer":
            return "int"
        elif prop_type == "number":
            return "float"
        elif prop_type == "boolean":
            return "bool"
        elif prop_type == "array":
            items_schema = prop_schema.get("items", {})
            if items_schema.get("type") == "object":
                # This is a nested object array, we'll need to create a nested model
                return f"List[{get_nested_model_name(prop_schema)}]"
            else:
                item_type = get_python_type(items_schema)
                return f"List[{item_type}]"
        elif prop_type == "object":
            return get_nested_model_name(prop_schema)
        else:
            return "Any"
    
    def get_nested_model_name(prop_schema: Dict[str, Any], context_name: str = "") -> str:
        """Generate a name for nested models."""
        if "title" in prop_schema:
            return prop_schema["title"]
        elif "description" in prop_schema:
            # Generate name from description
            desc = prop_schema["description"]
            name = re.sub(r'[^a-zA-Z0-9\s]', '', desc)
            name = ''.join(word.capitalize() for word in name.split()[:3])
            return name or f"{context_name}Model"
        else:
            return f"{context_name}Model" if context_name else "NestedModel"
    
    def generate_nested_models(schema: Dict[str, Any], generated_models: set) -> List[str]:
        """Generate code for nested Pydantic models."""
        models = []
        properties = schema.get("properties", {})
        
        for prop_name, prop_schema in properties.items():
            if prop_schema.get("type") == "object":
                model_name = get_nested_model_name(prop_schema)
                if model_name not in generated_models:
                    generated_models.add(model_name)
                    nested_model = generate_model_code(prop_schema, model_name, generated_models)
                    models.append(nested_model)
            elif prop_schema.get("type") == "array":
                items_schema = prop_schema.get("items", {})
                if items_schema.get("type") == "object":
                    model_name = get_nested_model_name(items_schema)
                    if model_name not in generated_models:
                        generated_models.add(model_name)
                        nested_model = generate_model_code(items_schema, model_name, generated_models)
                        models.append(nested_model)
        
        return models
    
    def generate_model_code(schema: Dict[str, Any], model_name: str, generated_models: set) -> str:
        """Generate Pydantic model code from schema."""
        properties = schema.get("properties", {})
        required_fields = set(schema.get("required", []))
        
        # Generate nested models first
        nested_models = generate_nested_models(schema, generated_models)
        
        # Generate main model
        lines = [f"class {model_name}(BaseModel):"]
        
        for prop_name, prop_schema in properties.items():
            python_type = get_python_type(prop_schema)
            description = prop_schema.get("description", "")
            
            if prop_name in required_fields:
                field_def = f'    {prop_name}: {python_type} = Field(description="{description}")'
            else:
                field_def = f'    {prop_name}: Optional[{python_type}] = Field(default=None, description="{description}")'
            
            lines.append(field_def)
        
        if not properties:
            lines.append("    pass")
        
        model_code = "\n".join(lines)
        
        # Combine nested models with main model
        if nested_models:
            return "\n\n".join(nested_models) + "\n\n" + model_code
        else:
            return model_code
    
    generated_models = set()
    return generate_model_code(schema, class_name, generated_models)

def update_ai_models_file(models_code: Dict[str, str]):
    """Update the ai_models.py file with new Pydantic models."""
    
    # Read current file
    models_file_path = "app/routers/ai/ai_models.py"
    with open(models_file_path, 'r') as f:
        current_content = f.read()
    
    # Extract imports
    import_lines = []
    other_lines = []
    in_imports = True
    
    for line in current_content.split('\n'):
        if line.strip().startswith('from ') or line.strip().startswith('import '):
            import_lines.append(line)
        elif line.strip() == '':
            if in_imports:
                import_lines.append(line)
            else:
                other_lines.append(line)
        else:
            in_imports = False
            other_lines.append(line)
    
    # Check if we need to add Literal import
    needs_literal = any('Literal[' in code for code in models_code.values())
    if needs_literal and 'from typing_extensions import Literal' not in current_content:
        import_lines.insert(-1, 'from typing_extensions import Literal')
    
    # Generate new content
    new_content_parts = []
    new_content_parts.extend(import_lines)
    new_content_parts.append('')
    
    # Add the new models
    for model_name, model_code in models_code.items():
        new_content_parts.append(model_code)
        new_content_parts.append('')
    
    new_content = '\n'.join(new_content_parts)
    
    # Write updated file
    with open(models_file_path, 'w') as f:
        f.write(new_content)
    
    print(f"Updated {models_file_path} with new models: {', '.join(models_code.keys())}")

def update_ai_prompts_file(prompt_templates: Dict[str, Any]):
    """Update the ai_prompts.py file with new prompt templates."""
    
    prompts_file_path = "app/routers/ai/ai_prompts.py"
    
    # Read current file
    with open(prompts_file_path, 'r') as f:
        current_content = f.read()
    
    # For now, we'll just log what we would update
    # In a full implementation, we'd parse and update the prompt templates
    print(f"Would update {prompts_file_path} with new prompt templates")
    for prompt_name, template in prompt_templates.items():
        print(f"  - {prompt_name}: {type(template)}")

def update_ai_chains_file(model_configs: Dict[str, Dict[str, Any]]):
    """Update the ai_chains.py file with new model configurations."""
    
    chains_file_path = "app/routers/ai/ai_chains.py"
    
    # Read current file
    with open(chains_file_path, 'r') as f:
        current_content = f.read()
    
    # Extract model configuration
    default_config = {
        "temperature": 0.2,
        "model": "gpt-4.1", 
        "max_tokens": 5000
    }
    
    # Update with any new configurations from LangSmith
    for prompt_name, config in model_configs.items():
        if config:
            default_config.update(config)
            print(f"Updated model config from {prompt_name}: {config}")
    
    # Update the model configuration in the file
    model_config_pattern = r'model = ChatOpenAI\((.*?)\)'
    
    new_config_parts = []
    for key, value in default_config.items():
        if isinstance(value, str):
            new_config_parts.append(f'{key}="{value}"')
        else:
            new_config_parts.append(f'{key}={value}')
    
    config_join = ',\n    '.join(new_config_parts)
    new_config_str = f"model = ChatOpenAI(\n    {config_join},\n    api_key=openai_api_key\n)"
    
    updated_content = re.sub(
        model_config_pattern,
        new_config_str,
        current_content,
        flags=re.DOTALL
    )
    
    # Write updated file
    with open(chains_file_path, 'w') as f:
        f.write(updated_content)
    
    print(f"Updated {chains_file_path} with new model configuration")

def sync_prompts():
    """Main function to sync prompts from LangSmith."""
    
    print("Starting LangSmith prompt sync...")
    
    models_to_update = {}
    prompts_to_update = {}
    model_configs = {}
    
    for langsmith_name, config in PROMPT_MAPPINGS.items():
        print(f"\nProcessing {langsmith_name}...")
        
        try:
            # Pull the chain from LangSmith
            chain = prompts.pull(langsmith_name, include_model=True)
            print(f"Successfully pulled {langsmith_name}")
            
            # Extract components
            components = extract_chain_components(chain)
            
            # Process schema if available
            if components["schema"]:
                print(f"Found schema for {langsmith_name}")
                pydantic_code = json_schema_to_pydantic(
                    components["schema"], 
                    config["model_class"]
                )
                models_to_update[config["model_class"]] = pydantic_code
            else:
                print(f"No schema found for {langsmith_name}")
            
            # Store prompt template
            if components["prompt_template"]:
                prompts_to_update[config["prompt_var"]] = components["prompt_template"]
            
            # Store model config
            if components["model_config"]:
                model_configs[langsmith_name] = components["model_config"]
                
        except Exception as e:
            print(f"Error processing {langsmith_name}: {e}")
            continue
    
    # Update files
    if models_to_update:
        update_ai_models_file(models_to_update)
    
    if prompts_to_update:
        update_ai_prompts_file(prompts_to_update)
    
    if model_configs:
        update_ai_chains_file(model_configs)
    
    print("\nSync completed!")

if __name__ == "__main__":
    sync_prompts()
