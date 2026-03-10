package com.icumanager.app.ui.patient;

import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.icumanager.app.R;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class OrderAdapter extends RecyclerView.Adapter<OrderAdapter.OrderViewHolder> {

    private JSONArray orders = new JSONArray();
    private final SimpleDateFormat apiFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
    private final SimpleDateFormat displayFormat = new SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.US);
    private final String currentUserRole;
    private final OnOrderActionListener actionListener;

    public interface OnOrderActionListener {
        void onUpdateStatus(String orderId, String newStatus, String orderType);
    }

    public OrderAdapter(String userRole, OnOrderActionListener actionListener) {
        this.currentUserRole = userRole;
        this.actionListener = actionListener;
    }

    public void setOrders(JSONArray newOrders) {
        this.orders = newOrders;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public OrderViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_order, parent, false);
        return new OrderViewHolder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull OrderViewHolder holder, int position) {
        JSONObject order = orders.optJSONObject(position);
        if (order == null)
            return;

        String id = order.optString("id");
        String title = order.optString("title");
        String type = order.optString("type");
        String status = order.optString("status");
        String priority = order.optString("priority", "ROUTINE");
        String notes = order.optString("notes");
        JSONObject details = order.optJSONObject("details");
        JSONObject author = order.optJSONObject("author");
        String createdAt = order.optString("createdAt");

        holder.textOrderTitle.setText(title);
        holder.textOrderType.setText(type);
        holder.textOrderStatus.setText(status);

        // Status Badge Color
        GradientDrawable statusBg = (GradientDrawable) holder.textOrderStatus.getBackground();
        switch (status) {
            case "APPROVED":
                statusBg.setColor(Color.parseColor("#10B981")); // Emerald
                break;
            case "PENDING":
                statusBg.setColor(Color.parseColor("#F59E0B")); // Amber
                break;
            case "COMPLETED":
                statusBg.setColor(Color.parseColor("#3B82F6")); // Blue
                break;
            case "DISCONTINUED":
                statusBg.setColor(Color.parseColor("#64748B")); // Slate
                break;
            default:
                statusBg.setColor(Color.parseColor("#94A3B8"));
        }

        if (!"ROUTINE".equals(priority)) {
            holder.textOrderPriority.setVisibility(View.VISIBLE);
            holder.textOrderPriority.setText(priority);
        } else {
            holder.textOrderPriority.setVisibility(View.GONE);
        }

        try {
            Date date = apiFormat.parse(createdAt);
            holder.textOrderTime.setText(displayFormat.format(date));
        } catch (Exception e) {
            holder.textOrderTime.setText(createdAt);
        }

        if (author != null) {
            holder.textOrderAuthor
                    .setText("Ordered by: " + author.optString("name") + " (" + author.optString("role") + ")");
        }

        if (details != null && details.has("info")) {
            holder.textOrderInfo.setVisibility(View.VISIBLE);
            holder.textOrderInfo.setText(details.optString("info"));
        } else {
            holder.textOrderInfo.setVisibility(View.GONE);
        }

        if (!notes.isEmpty() && !notes.equals("null")) {
            holder.textOrderNotes.setVisibility(View.VISIBLE);
            holder.textOrderNotes.setText("Note: " + notes);
        } else {
            holder.textOrderNotes.setVisibility(View.GONE);
        }

        // Setup Buttons based on status and role
        holder.btnApprove.setVisibility(View.GONE);
        holder.btnComplete.setVisibility(View.GONE);
        holder.btnDiscontinue.setVisibility(View.GONE);

        if ("PENDING".equals(status) && "SENIOR".equals(currentUserRole)) {
            holder.btnApprove.setVisibility(View.VISIBLE);
        }

        if ("PENDING".equals(status) || "APPROVED".equals(status)) {
            holder.btnDiscontinue.setVisibility(View.VISIBLE);
        }

        if ("APPROVED".equals(status)) {
            holder.btnComplete.setVisibility(View.VISIBLE);
        }

        // Hide entire action layout if empty
        if (holder.btnApprove.getVisibility() == View.GONE && holder.btnComplete.getVisibility() == View.GONE
                && holder.btnDiscontinue.getVisibility() == View.GONE) {
            holder.layoutOrderActions.setVisibility(View.GONE);
        } else {
            holder.layoutOrderActions.setVisibility(View.VISIBLE);
        }

        // Action Click Listeners
        holder.btnApprove.setOnClickListener(v -> actionListener.onUpdateStatus(id, "APPROVED", type));
        holder.btnComplete.setOnClickListener(v -> actionListener.onUpdateStatus(id, "COMPLETED", type));
        holder.btnDiscontinue.setOnClickListener(v -> actionListener.onUpdateStatus(id, "DISCONTINUED", type));
    }

    @Override
    public int getItemCount() {
        return orders.length();
    }

    static class OrderViewHolder extends RecyclerView.ViewHolder {
        TextView textOrderStatus, textOrderType, textOrderPriority, textOrderTime;
        TextView textOrderTitle, textOrderInfo, textOrderNotes, textOrderAuthor;
        LinearLayout layoutOrderActions;
        Button btnComplete, btnDiscontinue, btnApprove;

        public OrderViewHolder(@NonNull View itemView) {
            super(itemView);
            textOrderStatus = itemView.findViewById(R.id.textOrderStatus);
            textOrderType = itemView.findViewById(R.id.textOrderType);
            textOrderPriority = itemView.findViewById(R.id.textOrderPriority);
            textOrderTime = itemView.findViewById(R.id.textOrderTime);
            textOrderTitle = itemView.findViewById(R.id.textOrderTitle);
            textOrderInfo = itemView.findViewById(R.id.textOrderInfo);
            textOrderNotes = itemView.findViewById(R.id.textOrderNotes);
            textOrderAuthor = itemView.findViewById(R.id.textOrderAuthor);

            layoutOrderActions = itemView.findViewById(R.id.layoutOrderActions);
            btnComplete = itemView.findViewById(R.id.btnOrderComplete);
            btnDiscontinue = itemView.findViewById(R.id.btnOrderDiscontinue);
            btnApprove = itemView.findViewById(R.id.btnOrderApprove);
        }
    }
}
