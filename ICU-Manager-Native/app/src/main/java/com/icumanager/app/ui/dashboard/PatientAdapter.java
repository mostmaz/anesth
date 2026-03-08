package com.icumanager.app.ui.dashboard;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.chip.Chip;
import com.icumanager.app.R;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class PatientAdapter extends RecyclerView.Adapter<PatientAdapter.PatientViewHolder> {

    private JSONArray patients = new JSONArray();

    public void setPatients(JSONArray newPatients) {
        this.patients = newPatients;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public PatientViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_patient, parent, false);
        return new PatientViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull PatientViewHolder holder, int position) {
        try {
            JSONObject patient = patients.getJSONObject(position);
            holder.bind(patient);
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    @Override
    public int getItemCount() {
        return patients.length();
    }

    static class PatientViewHolder extends RecyclerView.ViewHolder {
        TextView textPatientName;
        Chip chipBedNumber;
        TextView textMrn;
        TextView textAgeGender;
        TextView textDiagnosis;

        public PatientViewHolder(@NonNull View itemView) {
            super(itemView);
            textPatientName = itemView.findViewById(R.id.textPatientName);
            chipBedNumber = itemView.findViewById(R.id.chipBedNumber);
            textMrn = itemView.findViewById(R.id.textMrn);
            textAgeGender = itemView.findViewById(R.id.textAgeGender);
            textDiagnosis = itemView.findViewById(R.id.textDiagnosis);
        }

        public void bind(JSONObject patient) throws JSONException {
            textPatientName.setText(patient.optString("name", "Unknown Patient"));
            chipBedNumber.setText(patient.optString("bedNumber", "N/A"));
            textMrn.setText("MRN: " + patient.optString("mrn", "Unknown"));

            String age = patient.optString("age", "--");
            String gender = patient.optString("gender", "U");
            textAgeGender.setText(age + (gender.length() > 0 ? gender.substring(0, 1).toUpperCase() : ""));

            textDiagnosis.setText("Diagnosis: " + patient.optString("diagnosis", "Not specified"));

            itemView.setOnClickListener(v -> {
                android.content.Context context = v.getContext();
                android.content.Intent intent = new android.content.Intent(context,
                        com.icumanager.app.ui.patient.PatientDetailsActivity.class);
                intent.putExtra("PATIENT_ID", patient.optString("id"));
                context.startActivity(intent);
            });
        }
    }
}
