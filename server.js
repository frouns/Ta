const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const fetch = require("node-fetch");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.OPENAI_API_KEY;

app.use(cors());
app.use(express.json());

app.post("/tarot", async (req, res) => {
  const { question } = req.body;
  const prompt = `Actúa como un tarotista intuitivo. Aquí hay una pregunta: "${question}". Selecciona 5 cartas al azar del tarot y proporciona una interpretación clara, breve y práctica.`;

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      })
    });

    const result = await openaiRes.json();
    const answer = result.choices?.[0]?.message?.content || "No se pudo generar respuesta.";
    res.json({ answer });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la llamada a OpenAI." });
  }
});

app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));