package com.icumanager.app.ui.patient;

import android.graphics.Color;
import android.graphics.Typeface;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.cardview.widget.CardView;
import androidx.recyclerview.widget.RecyclerView;
import com.icumanager.app.R;
import org.json.JSONArray;
import org.json.JSONObject;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

public class InvestigationsAdapter extends RecyclerView.Adapter<InvestigationsAdapter.ViewHolder> {

    public interface OnInvestigationActionListener {
        void onViewReport(String imageUrl);

        void onDelete(String invId, int position);
    }

    private JSONArray investigations = new JSONArray();
    private OnInvestigationActionListener listener;

    public InvestigationsAdapter(OnInvestigationActionListener listener) {
        this.listener = listener;
    }

    public InvestigationsAdapter() {
    }

    private static final SimpleDateFormat[] DATE_FORMATS = {
            makeUtcFmt("yyyy-MM-dd'T'HH:mm:ss.SSSX"),
            makeUtcFmt("yyyy-MM-dd'T'HH:mm:ssX"),
            makeUtcFmt("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
            makeUtcFmt("yyyy-MM-dd'T'HH:mm:ss'Z'"),
            makeUtcFmt("yyyy-MM-dd"),
    };
    private static final SimpleDateFormat DISPLAY_FMT = new SimpleDateFormat("MMM dd, yyyy  HH:mm",
            Locale.getDefault());

    private static SimpleDateFormat makeUtcFmt(String pattern) {
        SimpleDateFormat sdf = new SimpleDateFormat(pattern, Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        return sdf;
    }

    private String parseAndFormatDate(String raw) {
        if (raw == null || raw.isEmpty())
            return "--";
        for (SimpleDateFormat fmt : DATE_FORMATS) {
            try {
                Date d = fmt.parse(raw);
                if (d != null)
                    return DISPLAY_FMT.format(d);
            } catch (ParseException ignored) {
            }
        }
        return raw.length() > 16 ? raw.substring(0, 16).replace("T", "  ") : raw;
    }

    private static class ResultRow {
        final String label, value, reference, flag;
        final boolean isAbnormal;

        ResultRow(String l, String v, String r, String f, boolean a) {
            label = l;
            value = v;
            reference = r;
            flag = f;
            isAbnormal = a;
        }
    }

    private List<ResultRow> parseResultRows(JSONObject result) {
        List<ResultRow> rows = new ArrayList<>();
        if (result == null)
            return rows;
        Iterator<String> keys = result.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            if (key.equals("imageUrl") || key.equals("fileUrl") || key.equals("url") || key.startsWith("_"))
                continue;
            Object raw = result.opt(key);
            if (raw == null)
                continue;
            String label = humanise(key);
            if (raw instanceof JSONObject) {
                JSONObject obj = (JSONObject) raw;
                String val = obj.optString("value", obj.optString("result", ""));
                String unit = obj.optString("unit", obj.optString("units", ""));
                String ref = obj.optString("reference", obj.optString("normalRange", obj.optString("range", "")));
                String flag = obj.optString("flag", obj.optString("status", "")).toUpperCase();
                boolean abnormal = obj.optBoolean("isAbnormal", false);
                if (val.isEmpty() && obj.length() == 1)
                    val = String.valueOf(obj.opt(obj.keys().next()));
                String displayVal = val.isEmpty() ? "--" : unit.isEmpty() ? val : val + " " + unit;
                rows.add(new ResultRow(label, displayVal, ref, flag, abnormal));
            } else {
                String val = raw.toString().trim();
                if (!val.isEmpty())
                    rows.add(new ResultRow(label, val, "", "", false));
            }
        }
        return rows;
    }

    private String humanise(String key) {
        String s = key.replace("_", " ").replace("-", " ");
        s = s.replaceAll("([a-z])([A-Z])", "$1 $2");
        return s.isEmpty() ? key : Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private int flagColor(String flag, boolean isAbnormal) {
        if (isAbnormal)
            return Color.parseColor("#F87171");
        if (flag == null || flag.isEmpty())
            return Color.parseColor("#CBD5E1");
        switch (flag.toUpperCase()) {
            case "H":
            case "HIGH":
            case "HH":
                return Color.parseColor("#F87171");
            case "L":
            case "LOW":
            case "LL":
                return Color.parseColor("#60A5FA");
            case "C":
            case "CRITICAL":
                return Color.parseColor("#FF4444");
            case "N":
            case "NORMAL":
                return Color.parseColor("#4ADE80");
            default:
                return Color.parseColor("#CBD5E1");
        }
    }

    private String flagArrow(String flag, boolean isAbnormal) {
        if (isAbnormal)
            return " !";
        if (flag == null)
            return "";
        switch (flag.toUpperCase()) {
            case "H":
            case "HIGH":
            case "HH":
                return " \u2191";
            case "L":
            case "LOW":
            case "LL":
                return " \u2193";
            case "C":
            case "CRITICAL":
                return " \u203C";
            default:
                return "";
        }
    }

    public void setInvestigations(JSONArray arr) {
        this.investigations = arr;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_investigation, parent, false);
        return new ViewHolder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder h, int position) {
        JSONObject inv = investigations.optJSONObject(position);
        if (inv == null)
            return;

        String invId = inv.optString("id", "");
        h.textType.setText(inv.optString("type", "UNKNOWN").toUpperCase());
        h.textDate.setText(parseAndFormatDate(inv.optString("conductedAt", inv.optString("createdAt", ""))));
        h.textTitle.setText(inv.optString("title", "Unnamed Study"));

        // Delete button disabled in mobile app per request
        h.btnDelete.setVisibility(View.GONE);

        // Check overall abnormality for card background highlight
        JSONObject resultObj = inv.optJSONObject("result");
        List<ResultRow> rows = parseResultRows(resultObj);
        boolean anyAbnormal = rows.stream().anyMatch(r -> r.isAbnormal ||
                r.flag.equals("H") || r.flag.equals("HIGH") || r.flag.equals("L") ||
                r.flag.equals("LOW") || r.flag.equals("C") || r.flag.equals("CRITICAL") || r.flag.equals("HH")
                || r.flag.equals("LL"));

        // Abnormal badge
        if (h.textAbnormalBadge != null)
            h.textAbnormalBadge.setVisibility(anyAbnormal ? View.VISIBLE : View.GONE);

        // Card highlight for abnormal results
        if (h.cardView != null)
            h.cardView.setCardBackgroundColor(Color.parseColor(anyAbnormal ? "#2D1515" : "#1E293B"));

        // Report URL
        String reportUrl = "";
        if (resultObj != null) {
            reportUrl = resultObj.optString("imageUrl", resultObj.optString("fileUrl", resultObj.optString("url", "")));
        }
        if (reportUrl.isEmpty())
            reportUrl = inv.optString("fileUrl", inv.optString("imageUrl", ""));
        final String finalUrl = reportUrl;
        if (!finalUrl.isEmpty()) {
            h.btnViewReport.setVisibility(View.VISIBLE);
            h.btnViewReport.setOnClickListener(v -> {
                if (listener != null)
                    listener.onViewReport(finalUrl);
            });
        } else {
            h.btnViewReport.setVisibility(View.GONE);
        }

        // Result rows
        h.layoutResultRows.removeAllViews();
        if (!rows.isEmpty()) {
            h.divider.setVisibility(View.VISIBLE);
            h.layoutHeader.setVisibility(View.VISIBLE);
            h.textResult.setVisibility(View.GONE);
            for (int i = 0; i < rows.size(); i++) {
                ResultRow row = rows.get(i);
                LinearLayout rowLay = new LinearLayout(h.itemView.getContext());
                rowLay.setOrientation(LinearLayout.HORIZONTAL);
                rowLay.setPadding(0, 6, 0, 6);

                TextView tvLabel = new TextView(h.itemView.getContext());
                tvLabel.setText(row.label);
                tvLabel.setTextColor(Color.parseColor("#E2E8F0"));
                tvLabel.setTextSize(13f);
                tvLabel.setTypeface(null, Typeface.BOLD);
                tvLabel.setLayoutParams(new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 2f));

                TextView tvValue = new TextView(h.itemView.getContext());
                tvValue.setText(row.value + flagArrow(row.flag, row.isAbnormal));
                tvValue.setTextColor(flagColor(row.flag, row.isAbnormal));
                tvValue.setTextSize(row.isAbnormal ? 14f : 13f);
                tvValue.setTypeface(null, row.isAbnormal ? Typeface.BOLD : Typeface.NORMAL);
                tvValue.setLayoutParams(new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 2f));

                TextView tvRef = new TextView(h.itemView.getContext());
                tvRef.setText(row.reference);
                tvRef.setTextColor(Color.parseColor("#64748B"));
                tvRef.setTextSize(11f);
                tvRef.setGravity(android.view.Gravity.END);
                tvRef.setLayoutParams(new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 2f));

                rowLay.addView(tvLabel);
                rowLay.addView(tvValue);
                rowLay.addView(tvRef);
                h.layoutResultRows.addView(rowLay);
                if (i < rows.size() - 1) {
                    View sep = new View(h.itemView.getContext());
                    sep.setBackgroundColor(Color.parseColor("#1A334155"));
                    sep.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 1));
                    h.layoutResultRows.addView(sep);
                }
            }
        } else {
            h.divider.setVisibility(View.GONE);
            h.layoutHeader.setVisibility(View.GONE);
            String impression = inv.optString("impression", "");
            String notes = inv.optString("notes", "");
            String display = !impression.isEmpty() ? "Impression:\n" + impression : !notes.isEmpty() ? notes : "";
            if (!display.isEmpty()) {
                h.textResult.setText(display);
                h.textResult.setVisibility(View.VISIBLE);
            } else
                h.textResult.setVisibility(View.GONE);
        }
    }

    @Override
    public int getItemCount() {
        return investigations.length();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView textType, textDate, textTitle, textResult, textAbnormalBadge;
        Button btnViewReport, btnDelete;
        View divider;
        LinearLayout layoutHeader, layoutResultRows;
        CardView cardView;

        ViewHolder(View v) {
            super(v);
            textType = v.findViewById(R.id.textInvType);
            textDate = v.findViewById(R.id.textInvDate);
            textTitle = v.findViewById(R.id.textInvTitle);
            textResult = v.findViewById(R.id.textInvResult);
            textAbnormalBadge = v.findViewById(R.id.textAbnormalBadge);
            btnViewReport = v.findViewById(R.id.btnViewReport);
            btnDelete = v.findViewById(R.id.btnDelete);
            divider = v.findViewById(R.id.dividerResult);
            layoutHeader = v.findViewById(R.id.layoutResultHeader);
            layoutResultRows = v.findViewById(R.id.layoutResultRows);
            cardView = v.findViewById(R.id.cardInvestigation);
        }
    }
}
