"""Upload Pathlight complete chains with structured output to LangSmith."""

from dotenv import load_dotenv
from langchain import hub as prompts
from app.routers.ai.ai_chains import summary_chain, full_plan_chain

# Load environment variables
load_dotenv()


def push_complete_chains() -> None:
    """Push complete chains with structured output to LangSmith."""
    try:
        # Upload complete chains with JSON schema structured output
        summary_url = prompts.push("pathlight-summary-complete-chain", summary_chain)
        print(f"Summary complete chain uploaded to: {summary_url}")

        full_url = prompts.push("pathlight-full-plan-complete-chain", full_plan_chain)
        print(f"Full plan complete chain uploaded to: {full_url}")
        
        print("\nSuccess! Complete chains with structured output have been uploaded to LangSmith.")
        print("These chains include:")
        print("- Prompt templates")
        print("- Model configuration (gpt-4.1, temperature=0.2, max_tokens=5000)")
        print("- JSON schema structured output")
        
    except Exception as e:
        print(f"Error uploading chains: {e}")
        print("This might be due to serialization issues with the structured output.")


if __name__ == "__main__":
    push_complete_chains()
