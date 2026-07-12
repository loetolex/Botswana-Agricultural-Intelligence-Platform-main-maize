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
      disease = "Fall Armyworm",
      confidence = 0,
      country = "",
      district = "",
      cropOrAnimal = "Maize"
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
You are a senior agricultural entomologist and maize production specialist.

Crop: ${cropOrAnimal}
Pest: ${disease}
Confidence: ${confidence}%
Country: ${country}
District: ${district}

Generate a detailed evidence-based HTML report specifically for Fall Armyworm in maize.

Fall Armyworm scientific name:

Spodoptera frugiperda

Include information about:

- Identification of larvae
- Egg masses
- Feeding damage
- Window-pane feeding
- Whorl damage
- Frass inside the whorl
- Damage to tassels
- Damage to ears
- Life cycle
- Migration
- Environmental conditions favoring outbreaks
- Yield losses
- Economic importance

Return the following sections exactly.

<h2>Overview</h2>

Explain:

- what Fall Armyworm is
- symptoms
- pest biology
- life cycle
- host crops
- spread
- favorable environmental conditions.

<h2>Severity</h2>

Explain:

- severity
- expected yield losses
- economic importance
- infestation levels.

<h2>Immediate Actions</h2>

Provide immediate recommendations farmers should follow after detecting infestation.

<h2>Treatment Plan</h2>

Include:

- cultural control
- biological control
- mechanical control
- integrated pest management (IPM)
- chemical control

Mention practices such as:

- scouting
- hand removal of egg masses
- early planting
- destruction of heavily infested plants
- encouraging natural enemies
- crop rotation

Mention biological control agents such as:

- Trichogramma spp.
- Telenomus remus
- Bacillus thuringiensis (Bt)

Mention insecticides commonly recommended where appropriate such as:

- Emamectin benzoate
- Chlorantraniliprole
- Spinetoram
- Lambda-cyhalothrin

Explain that pesticides should always follow national agricultural regulations.

<h2>Prevention</h2>

Provide long-term prevention recommendations.

<h2>Economic Impact</h2>

Explain:

- yield losses
- grain quality reduction
- production costs
- food security implications
- financial losses.

<h2>Monitoring Plan</h2>

Explain:

- how frequently fields should be inspected
- scouting techniques
- pheromone traps
- thresholds for action
- indicators of successful control.

<h2>Scientific References</h2>

Provide an HTML list:

<ul>
<li>
<a href="URL">
Title - Authors (Year)
</a>
</li>
</ul>

Include at least five REAL references from:

- FAO
- CABI
- CIMMYT
- USDA
- NCBI
- PlantVillage
- Peer-reviewed journals.

<h2>Reference Images</h2>

Provide an HTML list:

<ul>
<li>
<img src="IMAGE_URL"/>
<a href="SOURCE_URL">
Caption
</a>
</li>
</ul>

Use REAL publicly accessible image URLs.

<h2>Scientific References JSON</h2>

[
  {
    "title":"",
    "authors":"",
    "year":"",
    "url":""
  }
]

<h2>Reference Images JSON</h2>

[
  {
    "caption":"",
    "imageUrl":"",
    "sourceUrl":""
  }
]

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

    const extractHtml = (html, title) => {
      const regex = new RegExp(
        `<h2>${title}<\\/h2>([\\s\\S]*?)(?=<h2>|$)`,
        "i"
      );

      const match = html.match(regex);

      return match
        ? match[1].trim()
        : "";
    };

    const parseJsonSection = (text) => {
      try {
        return JSON.parse(text);
      } catch {
        return [];
      }
    };

    const scientificReferencesJson =
      parseJsonSection(
        extractSection(
          report,
          "Scientific References JSON"
        )
      );

    const referenceImagesJson =
      parseJsonSection(
        extractSection(
          report,
          "Reference Images JSON"
        )
      );

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

      immediateActions:
        extractSection(
          report,
          "Immediate Actions"
        ),

      treatmentPlan:
        extractSection(
          report,
          "Treatment Plan"
        ),

      prevention:
        extractSection(
          report,
          "Prevention"
        ),

      economicImpact:
        extractSection(
          report,
          "Economic Impact"
        ),

      monitoringPlan:
        extractSection(
          report,
          "Monitoring Plan"
        ),

      scientificReferences:
        extractHtml(
          report,
          "Scientific References"
        ),

      referenceImages:
        extractHtml(
          report,
          "Reference Images"
        ),

      scientificReferencesJson,

      referenceImagesJson
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