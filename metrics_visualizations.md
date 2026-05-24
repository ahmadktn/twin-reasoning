# TwinReasoning Evaluation Visualizations

These visualizations were generated from the latest evaluation run using the true holding-out methodology. You can export these to include in your ablation solution paper to demonstrate the recommendation system's accuracy and the semantic quality of generated reviews.

## 1. Rating Prediction Accuracy

This scatter plot compares the model's predicted rating for a product against the true human rating. The red dashed line represents perfect accuracy. Some jitter has been added to the points to reveal density where predictions overlap.

![True vs Predicted Ratings Scatter Plot](/home/ahmadbb/.gemini/antigravity/brain/a13c8c09-e7aa-4fd7-90a6-78c49f7b67ec/artifacts/visualizations/rating_scatter.png)

## 2. Rating Error Distribution

This histogram shows the distribution of the errors (True Rating minus Predicted Rating). A tighter bell curve centered around `0` represents a highly accurate predictive model. 

![Rating Error Distribution Histogram](/home/ahmadbb/.gemini/antigravity/brain/a13c8c09-e7aa-4fd7-90a6-78c49f7b67ec/artifacts/visualizations/error_distribution.png)

## 3. ROUGE-L Score Distribution

The ROUGE-L distribution illustrates the semantic similarity between the generated reviews and the user's actual past reviews (or true product review). Higher concentrations toward the right indicate that the Digital Twin successfully adopted the human's writing style and vocabulary.

![ROUGE-L Score Distribution](/home/ahmadbb/.gemini/antigravity/brain/a13c8c09-e7aa-4fd7-90a6-78c49f7b67ec/artifacts/visualizations/rouge_distribution.png)
