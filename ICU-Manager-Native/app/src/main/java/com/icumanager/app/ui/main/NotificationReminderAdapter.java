package com.icumanager.app.ui.main;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.icumanager.app.R;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class NotificationReminderAdapter extends RecyclerView.Adapter<NotificationReminderAdapter.ViewHolder> {

    public interface OnMarkDoneListener {
        void onMarkDone(String orderId, int position);
    }

    private JSONArray reminders = new JSONArray();
    private OnMarkDoneListener listener;
    private final SimpleDateFormat apiFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
    private final SimpleDateFormat displayFormat = new SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault());

    public void setReminders(JSONArray reminders) {
        this.reminders = reminders;
        notifyDataSetChanged();
    }

    public void setOnMarkDoneListener(OnMarkDoneListener listener) {
        this.listener = listener;
    }

    public void removeAt(int position) {
        JSONArray updated = new JSONArray();
        for (int i = 0; i < reminders.length(); i++) {
            if (i != position)
                updated.put(reminders.optJSONObject(i));
        }
        reminders = updated;
        notifyItemRemoved(position);
        notifyItemRangeChanged(position, reminders.length());
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_notification_reminder, parent,
                false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        JSONObject reminder = reminders.optJSONObject(position);
        if (reminder == null)
            return;

        // Notification message text (custom text or fallback to title)
        JSONObject details = reminder.optJSONObject("details");
        String notificationText = null;
        if (details != null)
            notificationText = details.optString("notificationText", null);
        if (notificationText == null || notificationText.isEmpty()) {
            notificationText = reminder.optString("title", "Intervention Reminder");
        }
        holder.textTitle.setText(notificationText);

        // Patient info
        JSONObject patient = reminder.optJSONObject("patient");
        if (patient != null) {
            holder.textPatient.setText("Patient: " + patient.optString("name", "Unknown"));
        } else {
            holder.textPatient.setText("Patient: Unknown");
        }

        // Due time
        String reminderAt = reminder.optString("reminderAt", "");
        try {
            Date date = apiFormat.parse(reminderAt);
            if (date != null)
                reminderAt = "Due: " + displayFormat.format(date);
        } catch (Exception ignored) {
        }
        holder.textTime.setText(reminderAt);

        // Mark Done
        String orderId = reminder.optString("id", "");
        holder.btnMarkDone.setOnClickListener(v -> {
            if (listener != null) {
                listener.onMarkDone(orderId, holder.getAdapterPosition());
            }
        });
    }

    @Override
    public int getItemCount() {
        return reminders.length();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView textTitle, textPatient, textTime;
        Button btnMarkDone;

        ViewHolder(View itemView) {
            super(itemView);
            textTitle = itemView.findViewById(R.id.textReminderTitle);
            textPatient = itemView.findViewById(R.id.textReminderPatient);
            textTime = itemView.findViewById(R.id.textReminderTime);
            btnMarkDone = itemView.findViewById(R.id.btnMarkDone);
        }
    }
}
