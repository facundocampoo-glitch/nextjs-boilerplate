import express from "express";

const app = express();
app.use(express.json());

app.post("/generate", (req, res) => {
  res.json({
    status: "MIA backend alive",
    received: req.body
  });
});

app.listen(3001, () => {
  console.log("MIA backend running on port 3001");
});
