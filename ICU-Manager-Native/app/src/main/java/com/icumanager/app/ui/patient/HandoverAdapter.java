package com.icumanager.app.ui.patient;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.icumanager.app.R;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class HandoverAdapter extends RecyclerView.Adapter<HandoverAdapter.ViewHolder> {
    private JSONArray notes = new JSONArray();
    private final SimpleDateFormat apiFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
    private final SimpleDateFormat displayFormat = new SimpleDateFormat("MMM dd, yyyy", Locale.US);

    public void setNotes(JSONArray notes) {
        this.notes = notes;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_handover, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        JSONObject note = notes.optJSONObject(position);
        if (note != null) {
            try {
                String dateStr = note.optString("date");
                Date date = apiFormat.parse(dateStr);
                holder.textDate.setText(date != null ? displayFormat.format(date) : dateStr);
            } catch (Exception e) {
                holder.textDate.setText(note.optString("date", "--"));
            }

            JSONObject author = note.optJSONObject("author");
            holder.textAuthor.setText(author != null ? author.optString("name", "Unknown") : "Unknown");

            String shift = note.optString("shiftType", "");
            holder.textShift.setText(shift.isEmpty() ? "General Shift" : shift + " Shift");

            StringBuilder details = new StringBuilder();

            // Status Summary
            details.append("--- STATUS ---\n");
            details.append("GCS: ").append(note.optString("neuroGCS", "--"));
            details.append(" | RASS: ").append(note.optString("neuroRASS", "--")).append("\n");

            String ventMode = note.optString("respVentModeText", "");
            if (!ventMode.isEmpty() && !ventMode.equals("null")) {
                details.append("Vent Mode: ").append(ventMode);
                details.append(" (FiO2: ").append(note.optString("respFio2", "--")).append("%)\n");
            }

            boolean stable = note.optBoolean("hemoStable", false);
            boolean vaso = note.optBoolean("hemoVasopressor", false);
            details.append("Hemodynamics: ").append(stable ? "Stable" : "Unstable");
            if (vaso)
                details.append(" (Vasopressors Active)");
            details.append("\n\n");

            // Clinical Notes
            String clinical = note.optString("clinicalNotes", "");
            if (!clinical.isEmpty() && !clinical.equals("null")) {
                details.append("--- CLINICAL NOTE ---\n").append(clinical).append("\n\n");
            }

            // Plan
            boolean hasPlan = false;
            StringBuilder plan = new StringBuilder("--- PLAN ---\n");
            String[] planFields = { "planVentilatory", "planPhysio", "planConsult", "planInvestigation", "planFuture" };
            String[] planLabels = { "Ventilatory: ", "Physio: ", "Consult: ", "Investigations: ", "Future: " };

            for (int i = 0; i < planFields.length; i++) {
                String p = note.optString(planFields[i], "");
                if (!p.isEmpty() && !p.equals("null")) {
                    plan.append(planLabels[i]).append(p).append("\n");
                    hasPlan = true;
                }
            }

            if (hasPlan) {
                details.append(plan.toString());
            }

            holder.textDetails.setText(details.toString().trim());
        }
    }

    @Override
    public int getItemCount() {
        return notes.length();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView textDate, textAuthor, textShift, textDetails;

        ViewHolder(View itemView) {
            super(itemView);
            textDate = itemView.findViewById(R.id.textHandoverDate);
            textAuthor = itemView.findViewById(R.id.textHandoverAuthor);
            textShift = itemView.findViewById(R.id.textHandoverShift);
            textDetails = itemView.findViewById(R.id.textHandoverDetails);
        }
    }
}
