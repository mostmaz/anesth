package com.icumanager.app.ui.patient;

import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
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

public class InterventionsAdapter extends RecyclerView.Adapter<InterventionsAdapter.ViewHolder> {
    private JSONArray orders = new JSONArray();
    private final SimpleDateFormat apiFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
    private final SimpleDateFormat displayFormat = new SimpleDateFormat("MMM dd, yyyy", Locale.US);

    public void setOrders(JSONArray orders) {
        this.orders = orders;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_intervention, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        JSONObject order = orders.optJSONObject(position);
        if (order != null) {
            holder.textTitle.setText(order.optString("title", "Unknown Procedure"));

            String status = order.optString("status", "PENDING");
            holder.textStatus.setText(status);

            GradientDrawable shape = new GradientDrawable();
            shape.setCornerRadius(8);
            if ("COMPLETED".equals(status)) {
                shape.setColor(Color.parseColor("#10B981")); // Green
            } else if ("DISCONTINUED".equals(status)) {
                shape.setColor(Color.parseColor("#64748B")); // Slate
            } else {
                shape.setColor(Color.parseColor("#3B82F6")); // Blue
            }
            holder.textStatus.setBackground(shape);

            String priority = order.optString("priority", "ROUTINE");
            if ("STAT".equals(priority) || "URGENT".equals(priority)) {
                holder.textPriority.setText("PRIORITY: " + priority);
                holder.textPriority.setVisibility(View.VISIBLE);
            } else {
                holder.textPriority.setVisibility(View.GONE);
            }

            String timeField = "COMPLETED".equals(status) ? "updatedAt" : "createdAt";
            String dateLabel = "COMPLETED".equals(status) ? "Performed: " : "Created: ";
            String timeStr = order.optString(timeField);
            try {
                Date date = apiFormat.parse(timeStr);
                if (date != null)
                    timeStr = displayFormat.format(date);
            } catch (Exception ignored) {
            }

            holder.textDate.setText(dateLabel + timeStr);

            String notes = order.optString("notes", "");
            if (!notes.isEmpty() && !notes.equals("null")) {
                holder.textNotes.setText("Note: " + notes);
                holder.textNotes.setVisibility(View.VISIBLE);
            } else {
                holder.textNotes.setVisibility(View.GONE);
            }

            // Time Done and Reminder
            JSONObject details = order.optJSONObject("details");
            if (details != null && details.has("timeDone")) {
                String timeDoneStr = details.optString("timeDone");
                try {
                    Date date = apiFormat.parse(timeDoneStr);
                    if (date != null)
                        timeDoneStr = displayFormat.format(date);
                } catch (Exception ignored) {
                }
                holder.textTimeDone.setText("Done at: " + timeDoneStr);
                holder.textTimeDone.setVisibility(View.VISIBLE);
            } else {
                holder.textTimeDone.setVisibility(View.GONE);
            }

            String reminderAtStr = order.optString("reminderAt", "");
            if (!reminderAtStr.isEmpty() && !reminderAtStr.equals("null")) {
                try {
                    Date date = apiFormat.parse(reminderAtStr);
                    if (date != null) {
                        String displayDate = displayFormat.format(date);
                        if (!"COMPLETED".equals(status) && date.before(new Date())) {
                            holder.textCheckReminder.setText("Check due! (" + displayDate + ")");
                            holder.textCheckReminder.setTextColor(Color.parseColor("#EF4444")); // Red
                        } else {
                            holder.textCheckReminder.setText("Check reminder: " + displayDate);
                            holder.textCheckReminder.setTextColor(Color.parseColor("#F59E0B")); // Amber
                        }
                    }
                } catch (Exception ignored) {
                }
                holder.textCheckReminder.setVisibility(View.VISIBLE);
            } else {
                holder.textCheckReminder.setVisibility(View.GONE);
            }
        }
    }

    @Override
    public int getItemCount() {
        return orders.length();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView textTitle, textStatus, textPriority, textDate, textNotes, textTimeDone, textCheckReminder;

        ViewHolder(View itemView) {
            super(itemView);
            textTitle = itemView.findViewById(R.id.textInterventionTitle);
            textStatus = itemView.findViewById(R.id.textInterventionStatus);
            textPriority = itemView.findViewById(R.id.textInterventionPriority);
            textDate = itemView.findViewById(R.id.textInterventionDate);
            textNotes = itemView.findViewById(R.id.textInterventionNotes);
            textTimeDone = itemView.findViewById(R.id.textTimeDone);
            textCheckReminder = itemView.findViewById(R.id.textCheckReminder);
        }
    }
}
