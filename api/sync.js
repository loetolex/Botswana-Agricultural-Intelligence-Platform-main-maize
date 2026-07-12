import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const {
      userId,
      predictions,
      reports,
      farms,
      livestock,
      crops,
      healthRecords,
    } = req.body;

    const results = {};

    // ===========================
    // Farms
    // ===========================
    if (farms?.length) {
      const { data, error } =
        await supabase
          .from("farms")
          .upsert(farms)
          .select();

      if (error) throw error;

      results.farms = data;
    }

    // ===========================
    // Livestock
    // ===========================
    if (livestock?.length) {
      const { data, error } =
        await supabase
          .from("livestock")
          .upsert(livestock)
          .select();

      if (error) throw error;

      results.livestock = data;
    }

    // ===========================
    // Crops
    // ===========================
    if (crops?.length) {
      const { data, error } =
        await supabase
          .from("crops")
          .upsert(crops)
          .select();

      if (error) throw error;

      results.crops = data;
    }

    // ===========================
    // Health Records
    // ===========================
    if (healthRecords?.length) {
      const { data, error } =
        await supabase
          .from("health_records")
          .upsert(healthRecords)
          .select();

      if (error) throw error;

      results.healthRecords = data;
    }

    // ===========================
    // Disease Predictions
    // ===========================
    if (predictions?.length) {
      const { data, error } =
        await supabase
          .from("disease_predictions")
          .upsert(predictions)
          .select();

      if (error) throw error;

      results.predictions = data;
    }

    // ===========================
    // AI Reports
    // ===========================
    if (reports?.length) {
      const { data, error } =
        await supabase
          .from("ai_reports")
          .upsert(reports)
          .select();

      if (error) throw error;

      results.reports = data;
    }

    // Update user's last sync
    if (userId) {
      await supabase
        .from("users")
        .update({
          last_sync_at: new Date(),
        })
        .eq("id", userId);
    }

    return res.status(200).json({
      success: true,
      syncedAt: new Date(),
      results,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}