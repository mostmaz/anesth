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

public class InvestigationsAdapter extends RecyclerView.Adapter<InvestigationsAdapter.ViewHolder> {
    private JSONArray investigations = new JSONArray();
    private final SimpleDateFormat apiFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
    private final SimpleDateFormat displayFormat = new SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.US);

    public void setInvestigations(JSONArray investigations) {
        this.investigations = investigations;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_investigation, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        JSONObject inv = investigations.optJSONObject(position);
        if (inv != null) {
            holder.textType.setText(inv.optString("type", "UNKNOWN"));
            holder.textTitle.setText(inv.optString("title", "Unnamed Study"));

            try {
                String dateStr = inv.optString("conductedAt");
                Date date = apiFormat.parse(dateStr);
                holder.textDate.setText(date != null ? displayFormat.format(date) : dateStr);
            } catch (Exception e) {
                holder.textDate.setText(inv.optString("conductedAt", "--"));
            }

            JSONObject resultObj = inv.optJSONObject("result");
            if (resultObj != null) {
                try {
                    // Pretty print the JSON object with 2 space indentation for readability in
                    // monospace textview
                    holder.textResult.setText(resultObj.toString(2));
                    holder.textResult.setVisibility(View.VISIBLE);
                } catch (Exception e) {
                    holder.textResult.setText(resultObj.toString());
                    holder.textResult.setVisibility(View.VISIBLE);
                }
            } else {
                String impression = inv.optString("impression", "");
                if (!impression.isEmpty()) {
                    holder.textResult.setText("Impression:\n" + impression);
                    holder.textResult.setVisibility(View.VISIBLE);
                } else {
                    holder.textResult.setVisibility(View.GONE);
                }
            }
        }
    }

    @Override
    public int getItemCount() {
        return investigations.length();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView textType, textDate, textTitle, textResult;

        ViewHolder(View itemView) {
            super(itemView);
            textType = itemView.findViewById(R.id.textInvType);
            textDate = itemView.findViewById(R.id.textInvDate);
            textTitle = itemView.findViewById(R.id.textInvTitle);
            textResult = itemView.findViewById(R.id.textInvResult);
        }
    }
}
