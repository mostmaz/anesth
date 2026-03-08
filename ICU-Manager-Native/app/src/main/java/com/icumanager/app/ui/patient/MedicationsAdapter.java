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
import android.widget.Button;

public class MedicationsAdapter extends RecyclerView.Adapter<MedicationsAdapter.ViewHolder> {
    private JSONArray medications = new JSONArray();
    private final OnMedicationAdministerListener listener;

    public interface OnMedicationAdministerListener {
        void onAdminister(JSONObject medication);
    }

    public MedicationsAdapter(OnMedicationAdministerListener listener) {
        this.listener = listener;
    }

    public void setMedications(JSONArray medications) {
        this.medications = medications;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_medication, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        JSONObject med = medications.optJSONObject(position);
        if (med != null) {
            String name = med.optString("name", "Unknown Medication");
            holder.textName.setText(name);

            String dose = med.optString("defaultDose", "");
            String route = med.optString("route", "");
            String freq = med.optString("frequency", "");

            StringBuilder details = new StringBuilder();
            if (!dose.isEmpty())
                details.append(dose);
            if (!route.isEmpty())
                details.append(" | ").append(route);
            if (!freq.isEmpty())
                details.append(" | ").append(freq);

            holder.textDetails.setText(details.toString());

            String infusionRate = med.optString("infusionRate", "");
            String otherInstructions = med.optString("otherInstructions", "");
            String instructions = "";

            if (!infusionRate.isEmpty())
                instructions += "Rate: " + infusionRate;
            if (!otherInstructions.isEmpty()) {
                if (!instructions.isEmpty())
                    instructions += "\n";
                instructions += "Instructions: " + otherInstructions;
            }

            if (!instructions.trim().isEmpty()) {
                holder.textInstructions.setText(instructions);
                holder.textInstructions.setVisibility(View.VISIBLE);
            } else {
                holder.textInstructions.setVisibility(View.GONE);
            }

            boolean isActive = med.optBoolean("isActive", true);
            holder.btnRecordDose.setEnabled(isActive);
            holder.btnRecordDose.setAlpha(isActive ? 1.0f : 0.5f);

            holder.btnRecordDose.setOnClickListener(v -> {
                if (listener != null) {
                    listener.onAdminister(med);
                }
            });
        }
    }

    @Override
    public int getItemCount() {
        return medications.length();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView textName, textDetails, textInstructions;
        Button btnRecordDose;

        ViewHolder(View itemView) {
            super(itemView);
            textName = itemView.findViewById(R.id.textMedName);
            textDetails = itemView.findViewById(R.id.textMedDetails);
            textInstructions = itemView.findViewById(R.id.textMedInstructions);
            btnRecordDose = itemView.findViewById(R.id.btnRecordDose);
        }
    }
}
