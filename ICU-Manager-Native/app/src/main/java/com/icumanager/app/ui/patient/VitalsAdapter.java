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

public class VitalsAdapter extends RecyclerView.Adapter<VitalsAdapter.ViewHolder> {
    private JSONArray vitals = new JSONArray();
    private final SimpleDateFormat apiFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
    private final SimpleDateFormat displayFormat = new SimpleDateFormat("MMM dd, HH:mm", Locale.US);

    public void setVitals(JSONArray vitals) {
        this.vitals = vitals;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_vital, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        // Show newest entry at the top
        JSONObject vital = vitals.optJSONObject(position);
        if (vital != null) {
            try {
                String timestamp = vital.optString("timestamp");
                Date date = apiFormat.parse(timestamp);
                holder.textTime.setText(date != null ? displayFormat.format(date) : timestamp);
            } catch (Exception e) {
                holder.textTime.setText(vital.optString("timestamp"));
            }

            int hr = vital.optInt("heartRate", -1);
            holder.textHR.setText("HR: " + (hr != -1 ? hr : "--"));

            int bpSys = vital.optInt("bpSys", -1);
            int bpDia = vital.optInt("bpDia", -1);
            if (bpSys != -1 && bpDia != -1) {
                holder.textBP.setText("BP: " + bpSys + "/" + bpDia);
            } else {
                holder.textBP.setText("BP: --/--");
            }

            int spo2 = vital.optInt("spo2", -1);
            holder.textSpO2.setText("SpO2: " + (spo2 != -1 ? spo2 + "%" : "--"));

            double temp = vital.optDouble("temp", -1.0);
            holder.textTemp.setText("Temp: " + (temp != -1.0 ? temp + "°C" : "--"));

            int rbs = vital.optInt("rbs", -1);
            holder.textRbs.setText("RBS: " + (rbs != -1 ? rbs : "--"));
        }
    }

    @Override
    public int getItemCount() {
        return vitals.length();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView textTime, textHR, textBP, textSpO2, textTemp, textRbs;

        ViewHolder(View itemView) {
            super(itemView);
            textTime = itemView.findViewById(R.id.textVitalTime);
            textHR = itemView.findViewById(R.id.textVitalHR);
            textBP = itemView.findViewById(R.id.textVitalBP);
            textSpO2 = itemView.findViewById(R.id.textVitalSpO2);
            textTemp = itemView.findViewById(R.id.textVitalTemp);
            textRbs = itemView.findViewById(R.id.textVitalRbs);
        }
    }
}
