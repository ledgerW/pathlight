"""Upload Pathlight prompts and models to LangSmith."""

from langchain import hub as prompts
from langchain_openai import ChatOpenAI

from app.routers.ai.ai_prompts import summary_prompt, full_plan_prompt
from app.routers.ai.ai_models import SummaryOutput, FullPlanOutput


def push_prompts() -> None:
    """Push the prompt chains to LangSmith and print their URLs."""
    model = ChatOpenAI(model="gpt-4o-mini")

    summary_chain = summary_prompt | model.with_structured_output(SummaryOutput)
    summary_url = prompts.push("pathlight-summary-generator", summary_chain)
    print(f"Summary prompt uploaded to: {summary_url}")

    full_chain = full_plan_prompt | model.with_structured_output(FullPlanOutput)
    full_url = prompts.push("pathlight-full-plan-generator", full_chain)
    print(f"Full plan prompt uploaded to: {full_url}")


if __name__ == "__main__":
    push_prompts()
