export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {

    console.log(
      "GEMINI KEY EXISTS:",
      !!process.env.GEMINI_API_KEY
    );

    const {
      disease,
      confidence,
      country,
      district,
      cropOrAnimal
    } = req.body;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
You are a senior agricultural advisor.

Disease/Pest: ${disease}
Confidence: ${confidence}
Country: ${country}
District: ${district}
Category: ${cropOrAnimal}

Generate a detailed HTML report with:

<h2>Overview</h2>
<h2>Severity</h2>
<h2>Immediate Actions</h2>
<h2>Treatment Plan</h2>
<h2>Prevention</h2>
<h2>Economic Impact</h2>
<h2>Monitoring Plan</h2>

Return HTML only.
`
                }
              ]
            }
          ]
        })
      }
    );

    const data = await geminiResponse.json();

    console.log(
      "FULL GEMINI RESPONSE:",
      JSON.stringify(data, null, 2)
    );

    if (data.error) {
      return res.status(500).json({
        success: false,
        error: data.error.message,
        gemini: data
      });
    }

    const report =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!report) {
      return res.status(500).json({
        success: false,
        error: "Gemini returned no report",
        gemini: data
      });
    }

    const extractSection = (html, title) => {

      const regex = new RegExp(
        `<h2>${title}<\\/h2>([\\s\\S]*?)(?=<h2>|$)`,
        "i"
      );

      const match = html.match(regex);

      return match
        ? match[1]
            .replace(/<[^>]*>/g, "")
            .replace(/\n/g, " ")
            .trim()
        : "";
    };

    const structuredReport = {

      diseaseName: disease,

      confidenceLevel:
        confidence >= 90
          ? "High"
          : confidence >= 70
          ? "Medium"
          : "Low",

      overview: extractSection(
        report,
        "Overview"
      ),

      severity: extractSection(
        report,
        "Severity"
      ),

      immediateActions: extractSection(
        report,
        "Immediate Actions"
      ),

      treatmentPlan: extractSection(
        report,
        "Treatment Plan"
      ),

      prevention: extractSection(
        report,
        "Prevention"
      ),

      economicImpact: extractSection(
        report,
        "Economic Impact"
      ),

      monitoringPlan: extractSection(
        report,
        "Monitoring Plan"
      )
    };

    return res.status(200).json({
      success: true,
      report,
      structuredReport
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message
    });

  }

}