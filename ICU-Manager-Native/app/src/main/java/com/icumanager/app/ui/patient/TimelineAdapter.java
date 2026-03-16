package com.icumanager.app.ui.patient;

import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.icumanager.app.R;
import org.json.JSONArray;
import org.json.JSONObject;

public class TimelineAdapter extends RecyclerView.Adapter<TimelineAdapter.VH> {
    private JSONArray items = new JSONArray();

    public void setItems(JSONArray arr) {
        this.items = arr;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_timeline, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int position) {
        JSONObject item = items.optJSONObject(position);
        if (item == null) return;

        String type   = item.optString("type", "");
        String title  = item.optString("title", "Event");
        String status = item.optString("status", "");
        String detail = item.optString("details", "");
        String ts     = item.optString("timestamp", "");

        h.title.setText(title);
        h.status.setText(status);
        h.detail.setText(detail);

        // Format time
        if (ts.length() >= 16) {
            String time = ts.substring(11, 16);
            h.time.setText(time);
        } else {
            h.time.setText("");
        }

        // Dot color by type
        int color;
        switch (type) {
            case "MEDICATION":    color = Color.parseColor("#3B82F6"); break;
            case "ORDER":         color = Color.parseColor("#A855F7"); break;
            case "INVESTIGATION": color = Color.parseColor("#10B981"); break;
            case "CONSULTATION":  color = Color.parseColor("#F59E0B"); break;
            default:              color = Color.parseColor("#64748B"); break;
        }
        h.dot.setBackgroundTintList(android.content.res.ColorStateList.valueOf(color));

        // Status badge color
        if (status.equals("STARTED") || status.equals("COMPLETED") || status.equals("APPROVED")) {
            h.status.setBackgroundColor(Color.parseColor("#052E16"));
            h.status.setTextColor(Color.parseColor("#4ADE80"));
        } else if (status.equals("STOPPED") || status.equals("DISCONTINUED")) {
            h.status.setBackgroundColor(Color.parseColor("#450A0A"));
            h.status.setTextColor(Color.parseColor("#F87171"));
        } else {
            h.status.setBackgroundColor(Color.parseColor("#1E293B"));
            h.status.setTextColor(Color.parseColor("#94A3B8"));
        }
    }

    @Override
    public int getItemCount() { return items.length(); }

    static class VH extends RecyclerView.ViewHolder {
        View dot; TextView title, time, status, detail;
        VH(View v) {
            super(v);
            dot    = v.findViewById(R.id.viewDot);
            title  = v.findViewById(R.id.textTimelineTitle);
            time   = v.findViewById(R.id.textTimelineTime);
            status = v.findViewById(R.id.textTimelineStatus);
            detail = v.findViewById(R.id.textTimelineDetail);
        }
    }
}
