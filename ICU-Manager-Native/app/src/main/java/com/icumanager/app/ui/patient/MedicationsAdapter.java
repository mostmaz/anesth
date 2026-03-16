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
import android.util.Log;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

public class MedicationsAdapter extends RecyclerView.Adapter<MedicationsAdapter.ViewHolder> {
    private JSONArray medications = new JSONArray();
    private final OnMedicationActionListener listener;

    public interface OnMedicationActionListener {
        void onAdminister(JSONObject medication);

        void onStop(JSONObject medication);

        void onShowHistory(JSONObject medication);
    }

    public MedicationsAdapter(OnMedicationActionListener listener) {
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
            String dilution = med.optString("dilution", "");
            String otherInstructions = med.optString("otherInstructions", "");
            StringBuilder instructions = new StringBuilder();

            if (!infusionRate.isEmpty())
                instructions.append("Rate: ").append(infusionRate);
            if (!dilution.isEmpty() && !dilution.equals("null")) {
                if (instructions.length() > 0)
                    instructions.append(" | ");
                instructions.append("Dilution: ").append(dilution).append(" ml");
            }
            if (!otherInstructions.isEmpty()) {
                if (instructions.length() > 0)
                    instructions.append("\n");
                instructions.append("Instructions: ").append(otherInstructions);
            }

            if (instructions.length() > 0) {
                holder.textInstructions.setText(instructions.toString());
                holder.textInstructions.setVisibility(View.VISIBLE);
            } else {
                holder.textInstructions.setVisibility(View.GONE);
            }

            // Day counter badge — calculated from startedAt
            String startedAt = med.optString("startedAt", "");
            if (!startedAt.isEmpty() && !startedAt.equals("null")) {
                try {
                    // Parse ISO date (2024-01-15T08:00:00.000Z)
                    String datePart = startedAt.split("T")[0];
                    SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
                    Date startDate = sdf.parse(datePart);
                    if (startDate != null) {
                        long diffMs = System.currentTimeMillis() - startDate.getTime();
                        long dayCount = TimeUnit.MILLISECONDS.toDays(diffMs) + 1;
                        holder.textDayCounter.setText("Day " + dayCount);
                        holder.textDayCounter.setVisibility(View.VISIBLE);
                    } else {
                        holder.textDayCounter.setVisibility(View.GONE);
                    }
                } catch (Exception e) {
                    holder.textDayCounter.setVisibility(View.GONE);
                }
            } else {
                holder.textDayCounter.setVisibility(View.GONE);
            }

            // Meta info (Reminder, Started Date)
            int reminder = med.optInt("durationReminder", 0);
            StringBuilder meta = new StringBuilder();
            if (reminder > 0) {
                meta.append("Reminder: ").append(reminder).append(" days");
            }
            if (!startedAt.isEmpty() && !startedAt.equals("null")) {
                if (meta.length() > 0)
                    meta.append(" | ");
                meta.append("Started: ").append(startedAt.split("T")[0]);
            }

            if (meta.length() > 0) {
                holder.textMeta.setText(meta.toString());
                holder.textMeta.setVisibility(View.VISIBLE);
            } else {
                holder.textMeta.setVisibility(View.GONE);
            }

            // Last administration info
            JSONArray administrations = med.optJSONArray("Administrations");
            if (administrations != null && administrations.length() > 0) {
                JSONObject lastAdm = null;
                String lastTime = "";
                for (int i = 0; i < administrations.length(); i++) {
                    JSONObject adm = administrations.optJSONObject(i);
                    if (adm != null) {
                        String t = adm.optString("administeredAt", "");
                        if (t.compareTo(lastTime) > 0) {
                            lastTime = t;
                            lastAdm = adm;
                        }
                    }
                }
                if (lastAdm != null) {
                    String timeStr = lastTime.length() >= 16
                            ? lastTime.substring(0, 16).replace("T", " ")
                            : lastTime;
                    String lastDose = lastAdm.optString("dose", "");
                    JSONObject admUser = lastAdm.optJSONObject("User");
                    String nurse = (admUser != null) ? admUser.optString("name", "") : "";
                    StringBuilder sb = new StringBuilder("Last given: ").append(timeStr);
                    if (!lastDose.isEmpty()) sb.append(" · ").append(lastDose);
                    if (!nurse.isEmpty()) sb.append(" (").append(nurse).append(")");
                    holder.textLastAdmin.setText(sb.toString());
                    holder.textLastAdmin.setVisibility(View.VISIBLE);
                } else {
                    holder.textLastAdmin.setVisibility(View.GONE);
                }
            } else {
                holder.textLastAdmin.setVisibility(View.GONE);
            }

            boolean isActive = med.optBoolean("isActive", true);
            holder.btnRecordDose.setEnabled(isActive);
            holder.btnRecordDose.setAlpha(isActive ? 1.0f : 0.5f);
            holder.btnStopMed.setVisibility(isActive ? View.VISIBLE : View.GONE);

            holder.btnRecordDose.setOnClickListener(v -> {
                if (listener != null) {
                    listener.onAdminister(med);
                }
            });

            holder.btnStopMed.setOnClickListener(v -> {
                if (listener != null) {
                    listener.onStop(med);
                }
            });

            holder.itemView.setOnLongClickListener(v -> {
                if (listener != null) {
                    listener.onShowHistory(med);
                }
                return true;
            });
        }
    }

    @Override
    public int getItemCount() {
        return medications.length();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView textName, textDetails, textInstructions, textMeta, textLastAdmin, textDayCounter;
        Button btnRecordDose, btnStopMed;

        ViewHolder(View itemView) {
            super(itemView);
            textName        = itemView.findViewById(R.id.textMedName);
            textDayCounter  = itemView.findViewById(R.id.textDayCounter);
            textDetails     = itemView.findViewById(R.id.textMedDetails);
            textInstructions= itemView.findViewById(R.id.textMedInstructions);
            textMeta        = itemView.findViewById(R.id.textMedMeta);
            textLastAdmin   = itemView.findViewById(R.id.textLastAdmin);
            btnRecordDose   = itemView.findViewById(R.id.btnRecordDose);
            btnStopMed      = itemView.findViewById(R.id.btnStopMed);
        }
    }
}
