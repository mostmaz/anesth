package com.icumanager.app.ui.main;

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

public class DashboardOrderAdapter extends RecyclerView.Adapter<DashboardOrderAdapter.ViewHolder> {
    private JSONArray orders = new JSONArray();
    private final SimpleDateFormat apiFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
    private final SimpleDateFormat displayFormat = new SimpleDateFormat("MMM dd, HH:mm", Locale.US);

    public void setOrders(JSONArray orders) {
        this.orders = orders;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_dashboard_order, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        JSONObject order = orders.optJSONObject(position);
        if (order != null) {
            holder.textTitle.setText(order.optString("title", "Unknown Task"));

            String type = order.optString("type", "UNKNOWN");
            holder.textType.setText(type);

            String priority = order.optString("priority", "ROUTINE");
            GradientDrawable shape = new GradientDrawable();
            shape.setCornerRadius(8); // Reduced radius since it's just a stripe now

            if ("STAT".equals(priority)) {
                holder.viewUrgency.setBackgroundColor(Color.parseColor("#EF4444")); // Red
            } else if ("URGENT".equals(priority)) {
                holder.viewUrgency.setBackgroundColor(Color.parseColor("#F59E0B")); // Amber
            } else {
                holder.viewUrgency.setBackgroundColor(Color.parseColor("#3B82F6")); // Blue
            }

            JSONObject patient = order.optJSONObject("patient");
            if (patient != null) {
                String pName = patient.optString("name", "Unknown Patient");
                String bed = patient.optString("bedNumber", "--");
                holder.textPatient.setText("Patient: " + pName + " (Bed: " + bed + ")");
            } else {
                holder.textPatient.setText("Unknown Patient");
            }

            String timeStr = order.optString("createdAt");
            try {
                Date date = apiFormat.parse(timeStr);
                if (date != null) {
                    timeStr = displayFormat.format(date);
                }
            } catch (Exception ignored) {
            }
            holder.textTime.setText(timeStr);
        }
    }

    @Override
    public int getItemCount() {
        return orders.length();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView textTitle, textType, textPatient, textTime;
        View viewUrgency;

        ViewHolder(View itemView) {
            super(itemView);
            textTitle = itemView.findViewById(R.id.textOrderTitle);
            textType = itemView.findViewById(R.id.textOrderType);
            textPatient = itemView.findViewById(R.id.textOrderPatient);
            textTime = itemView.findViewById(R.id.textOrderTime);
            viewUrgency = itemView.findViewById(R.id.viewOrderUrgency);
        }
    }
}
