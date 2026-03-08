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

public class IoAdapter extends RecyclerView.Adapter<IoAdapter.ViewHolder> {
    private JSONArray entries = new JSONArray();
    private final SimpleDateFormat apiFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
    private final SimpleDateFormat displayFormat = new SimpleDateFormat("MMM dd, HH:mm", Locale.US);

    public void setEntries(JSONArray entries) {
        this.entries = entries;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_io, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        JSONObject entry = entries.optJSONObject(position);
        if (entry != null) {
            String type = entry.optString("type", "INPUT");
            holder.textType.setText(type);

            // Dynamic pill coloring
            GradientDrawable shape = new GradientDrawable();
            shape.setCornerRadius(8);
            if ("INPUT".equals(type)) {
                shape.setColor(Color.parseColor("#3B82F6")); // Blue
                holder.textAmount.setText("+" + entry.optInt("amount", 0) + " mL");
                holder.textAmount.setTextColor(Color.parseColor("#60A5FA"));
            } else {
                shape.setColor(Color.parseColor("#F59E0B")); // Amber
                holder.textAmount.setText("-" + entry.optInt("amount", 0) + " mL");
                holder.textAmount.setTextColor(Color.parseColor("#FBBF24"));
            }
            holder.textType.setBackground(shape);

            holder.textCategory.setText(entry.optString("category", "Unknown"));

            String timeStr = entry.optString("timestamp");
            try {
                Date date = apiFormat.parse(timeStr);
                timeStr = date != null ? displayFormat.format(date) : timeStr;
            } catch (Exception ignored) {
            }

            String user = "Unknown";
            JSONObject userObj = entry.optJSONObject("user");
            if (userObj != null)
                user = userObj.optString("name", "Unknown");

            String notes = entry.optString("notes", "");
            String details = timeStr + " • " + user;
            if (!notes.isEmpty() && !notes.equals("null")) {
                details += "\nNote: " + notes;
            }
            holder.textDetails.setText(details);
        }
    }

    @Override
    public int getItemCount() {
        return entries.length();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView textType, textCategory, textDetails, textAmount;

        ViewHolder(View itemView) {
            super(itemView);
            textType = itemView.findViewById(R.id.textIoType);
            textCategory = itemView.findViewById(R.id.textIoCategory);
            textDetails = itemView.findViewById(R.id.textIoDetails);
            textAmount = itemView.findViewById(R.id.textIoAmount);
        }
    }
}
