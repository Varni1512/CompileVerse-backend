// index.js

const express = require("express");
const cors = require("cors");
const { executeCode } = require("./executeCode"); // Updated import
const { aiCodeReview, getComplexityAnalysis, explainError } = require("./aiCodeReview");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get("/", (req, res) => {
  res.json({ message: "Online Compiler" });
});

app.post("/run", async (req, res) => {
  // language, code, and input are now the only things we need
  const { language = "cpp", code, input = "" } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, error: "Code is required." });
  }

  try {
    // Directly call executeCode with the raw code and input
    const output = await executeCode(language, code, input);
    const complexity = await getComplexityAnalysis(code);
    
    // The response is simpler now
    res.json({ 
      output, 
      complexity 
    });
  } catch (err) {
    // The error object from executeCode contains an 'error' property
    res.status(500).json({ success: false, error: err.error || "Execution failed" });
  }
});

// No changes needed for your other endpoints
app.post("/ai-review", async (req,res) => {
    // ... same as before
    const {code} = req.body;
    if(code === undefined || code.trim() === ''){
      return res.status(400).json({
        success: false,
        error: "Empty code! please provide some code to execute"
      });
    }
    try{
      const review = await aiCodeReview(code);
      res.status(200).json({"review":review});
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message || error.toString() || 'An error occurred while executing the code'
      });
    }
});

app.post("/explain-error", async (req, res) => {
    // ... same as before
    const { errorMessage, code, language } = req.body;
  
    if (!errorMessage || errorMessage.trim() === '') {
      return res.status(400).json({
        success: false,
        error: "Error message is required!"
      });
    }
    
    try {
      const explanation = await explainError(errorMessage, code, language);
      res.status(200).json({ 
        success: true,
        explanation: explanation 
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message || error.toString() || 'An error occurred while explaining the error'
      });
    }
});


app.listen(8000, () => {
  console.log("Server is running on port 8000");
});