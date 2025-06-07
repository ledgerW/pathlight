# Result Regeneration Functionality

This document outlines the result regeneration functionality implemented in the Pathlight project, which allows users to regenerate their results by paying again.

## Overview

The result regeneration feature allows users to update their AI-generated results after they've already received their initial results. This is useful when:

1. Users have updated their responses and want new insights based on the changes
2. Users want to see different perspectives or variations in their results
3. Users are not satisfied with their initial results and want to try again

The system tracks how many times a user has regenerated their results and requires payment for each regeneration.

## Implementation Details

### Database Schema

The `Result` model includes fields to support regeneration:

```python
class Result(SQLModel, table=True):
    __tablename__ = "results"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", unique=True)
    basic_plan: str  # Stores SummaryOutput as JSON
    full_plan: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_generated_at: datetime = Field(default_factory=datetime.utcnow)
    regeneration_count: int = Field(default=0)  # Track number of regenerations
    
    # Relationships
    user: User = Relationship(back_populates="result")
```

The `regeneration_count` field tracks how many times a user has regenerated their results.

### Backend Implementation

#### Payment System

The payment system was modified to allow users to pay again for regenerating results:

```python
@router.post("/{user_id}/create-checkout-session/{tier}", response_model=Dict)
async def create_checkout_session(
    user_id: uuid.UUID, 
    tier: str,
    is_regeneration: bool = False,
    session: Session = Depends(get_session),
    request: Request = None
):
    # Check if is_regeneration was passed as a query parameter
    if request and not is_regeneration:
        query_params = request.query_params
        is_regeneration_str = query_params.get('is_regeneration', 'false').lower()
        is_regeneration = is_regeneration_str == 'true'
        
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate tier
    if tier not in ["basic", "premium"]:
        raise HTTPException(status_code=400, detail="Invalid tier. Must be 'basic' or 'premium'")
    
    # Check if user has already paid for this tier or higher
    # Skip this check if it's a regeneration payment
    if not is_regeneration and ((tier == "basic" and user.payment_tier in ["basic", "premium"]) or \
       (tier == "premium" and user.payment_tier == "premium")):
        raise HTTPException(status_code=400, detail=f"User has already paid for {tier} tier")
    
    # Create Stripe checkout session...
```

The key change is the addition of the `is_regeneration` parameter, which allows the system to bypass the "already paid" check when the user is specifically paying to regenerate results.

#### AI Generation

The AI generation endpoints were updated to increment the regeneration count:

```python
# In generate_basic_results function
if existing_result:
    # Update existing result
    existing_result.basic_plan = basic_plan_json
    existing_result.last_generated_at = datetime.utcnow()
    # Increment regeneration count if this is not the first generation
    if existing_result.basic_plan:
        existing_result.regeneration_count += 1
    session.add(existing_result)
```

```python
# In generate_premium_results function
if existing_result:
    # Update existing result
    existing_result.full_plan = full_plan_json
    existing_result.last_generated_at = datetime.utcnow()
    # Increment regeneration count if this is not the first generation
    if existing_result.full_plan:
        existing_result.regeneration_count += 1
    session.add(existing_result)
```

#### Results API

The `check-results` endpoint was updated to include the regeneration count in the response:

```python
@router.get("/{user_id}/check-results", response_model=Dict)
def check_results(user_id: uuid.UUID, session: Session = Depends(get_session)):
    """Check if results exist for a user and when they were last generated"""
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if results exist for this user
    statement = select(Result).where(Result.user_id == user_id)
    result = session.exec(statement).first()
    
    if result and result.basic_plan:
        # Format the last generated timestamp
        last_generated = result.last_generated_at.strftime("%Y-%m-%d %H:%M:%S")
        
        return {
            "has_results": True,
            "payment_tier": user.payment_tier,
            "last_generated_at": last_generated,
            "regeneration_count": result.regeneration_count
        }
    
    return {
        "has_results": False,
        "payment_tier": user.payment_tier,
        "last_generated_at": None,
        "regeneration_count": 0
    }
```

### Frontend Implementation

#### Regeneration Payment Modal

The regeneration payment modal was updated to display the regeneration count:

```html
<!-- Regeneration Payment Modal -->
<div id="regenerationPaymentModal" class="modal" style="display: none;">
    <div class="modal-content">
        <span class="close-modal">&times;</span>
        <h2>Regenerate Your Personal Insight</h2>
        <p>You've already generated results for these responses.</p>
        <p>Your last results were generated on <span id="lastGeneratedDate">...</span></p>
        <p>You have regenerated your results <span id="regenerationCount">0</span> times so far.</p>
        <p>To generate new results with your current responses, you'll need to pay $0.99 again.</p>
        <div class="payment-buttons">
            <button id="proceedToRegenerationPayment" class="btn-primary">Regenerate ($0.99)</button>
            <button id="cancelRegeneration" class="btn-secondary">Cancel</button>
        </div>
    </div>
</div>
```

#### JavaScript Functions

The `showRegenerationPaymentModal` function was updated to display the regeneration count:

```javascript
// Show regeneration payment modal
function showRegenerationPaymentModal(lastGeneratedAt, regenerationCount = 0) {
    // Update the last generated date in the modal
    document.getElementById('lastGeneratedDate').textContent = lastGeneratedAt || 'an earlier date';
    
    // Update the regeneration count in the modal
    document.getElementById('regenerationCount').textContent = regenerationCount;
    
    // Show the modal
    document.getElementById('regenerationPaymentModal').style.display = 'flex';
}
```

The `initiatePayment` function was updated to pass the regeneration flag:

```javascript
// Initiate payment process
async function initiatePayment(tier, isRegeneration = false) {
    try {
        // Store current tier
        currentTier = tier;
        
        // Hide payment modals
        document.getElementById('basicPaymentModal').style.display = 'none';
        document.getElementById('premiumPaymentModal').style.display = 'none';
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingMessage = document.getElementById('loadingMessage');
        loadingOverlay.style.display = 'flex';
        loadingMessage.textContent = 'Preparing payment...';
        
        // Call payment API to create checkout session
        // Add is_regeneration parameter if needed
        const url = isRegeneration 
            ? `/api/payments/${user.id}/create-checkout-session/${tier}?is_regeneration=true`
            : `/api/payments/${user.id}/create-checkout-session/${tier}`;
            
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        // Rest of the function...
    }
}
```

The regeneration payment button was updated to pass the regeneration flag:

```javascript
// Regeneration payment modal buttons
document.getElementById('proceedToRegenerationPayment').addEventListener('click', () => {
    initiatePayment('basic', true); // Pass true for regeneration
    document.getElementById('regenerationPaymentModal').style.display = 'none';
});
```

## User Flow

1. User completes the form and receives their initial results
2. User decides to update their responses or wants new insights
3. User clicks the "Update Purpose" button
4. System checks if results already exist and shows the regeneration payment modal
5. Modal displays when results were last generated and how many times they've been regenerated
6. User pays to regenerate results
7. System generates new results and increments the regeneration count
8. User receives their updated results

## Future Improvements

1. **Tiered Pricing**: Consider implementing tiered pricing for regenerations (e.g., first regeneration costs $0.99, subsequent regenerations cost less)
2. **Result History**: Store and allow users to view previous versions of their results
3. **Comparison View**: Allow users to compare their new results with previous versions
4. **Regeneration Analytics**: Track which questions were changed between regenerations to gain insights into user behavior

This document will be updated as the regeneration functionality evolves.
