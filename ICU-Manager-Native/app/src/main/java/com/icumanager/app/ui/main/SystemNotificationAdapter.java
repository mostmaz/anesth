package com.icumanager.app.ui.main;

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

public class SystemNotificationAdapter extends RecyclerView.Adapter<SystemNotificationAdapter.ViewHolder> {

    public interface OnNotificationClickListener {
        void onNotificationClick(String patientId);
    }

    private JSONArray notifications = new JSONArray();
    private OnNotificationClickListener listener;
    private final SimpleDateFormat apiFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
    private final SimpleDateFormat displayFormat = new SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault());

    public void setNotifications(JSONArray notifications) {
        this.notifications = notifications;
        notifyDataSetChanged();
    }

    public void setOnNotificationClickListener(OnNotificationClickListener listener) {
        this.listener = listener;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_system_notification, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        JSONObject item = notifications.optJSONObject(position);
        if (item == null)
            return;

        // Title: "New [Type] Result: [Title]"
        String type = item.optString("type", "Investigation");
        String title = item.optString("title", item.optString("testName", "Result"));
        holder.textTitle.setText("New " + type + ": " + title);

        // Patient Info
        JSONObject patient = item.optJSONObject("patient");
        String patientName = (patient != null) ? patient.optString("name", "Unknown") : "Unknown Patient";
        holder.textPatient.setText("Patient: " + patientName);

        // Time
        String createdAt = item.optString("createdAt", item.optString("date", ""));
        try {
            Date date = apiFormat.parse(createdAt);
            if (date != null) {
                createdAt = displayFormat.format(date);
            }
        } catch (Exception ignored) {
        }
        holder.textTime.setText(createdAt);

        // Status Indicator (Abnormal)
        boolean isAbnormal = false;
        JSONObject result = item.optJSONObject("result");
        if (result != null) {
            JSONArray keys = result.names();
            if (keys != null) {
                for (int i = 0; i < keys.length(); i++) {
                    JSONObject val = result.optJSONObject(keys.optString(i));
                    if (val != null && val.optBoolean("isAbnormal", false)) {
                        isAbnormal = true;
                        break;
                    }
                }
            }
        }

        holder.viewStatusIndicator.setVisibility(isAbnormal ? View.VISIBLE : View.GONE);
        if (isAbnormal) {
            holder.viewStatusIndicator.setBackgroundColor(0xFFEF4444); // rose-500
        }

        String patientId = item.optString("patientId", "");
        holder.itemView.setOnClickListener(v -> {
            if (listener != null && !patientId.isEmpty()) {
                listener.onNotificationClick(patientId);
            }
        });
    }

    @Override
    public int getItemCount() {
        return Math.min(notifications.length(), 10); // Limit to top 10
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView textTitle, textPatient, textTime;
        View viewStatusIndicator;

        ViewHolder(View itemView) {
            super(itemView);
            textTitle = itemView.findViewById(R.id.textNotificationTitle);
            textPatient = itemView.findViewById(R.id.textNotificationPatient);
            textTime = itemView.findViewById(R.id.textNotificationTime);
            viewStatusIndicator = itemView.findViewById(R.id.viewStatusIndicator);
        }
    }
}
