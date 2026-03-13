package com.icumanager.app.ui.patient;

import android.content.Context;
import android.content.Intent;
import android.graphics.Typeface;
import android.net.Uri;
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

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

public class InvestigationsAdapter extends RecyclerView.Adapter<InvestigationsAdapter.ViewHolder> {

    private JSONArray investigations = new JSONArray();

    // ── Date parsing ─────────────────────────────────────────────────────────

    private static final SimpleDateFormat[] DATE_FORMATS = {
            makeUtcFmt("yyyy-MM-dd'T'HH:mm:ss.SSSX"),
            makeUtcFmt("yyyy-MM-dd'T'HH:mm:ssX"),
            makeUtcFmt("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
            makeUtcFmt("yyyy-MM-dd'T'HH:mm:ss'Z'"),
            makeUtcFmt("yyyy-MM-dd"),
    };

    private static final SimpleDateFormat DISPLAY_FMT =
            new SimpleDateFormat("MMM dd, yyyy  HH:mm", Locale.getDefault());

    private static SimpleDateFormat makeUtcFmt(String pattern) {
        SimpleDateFormat sdf = new SimpleDateFormat(pattern, Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        return sdf;
    }

    private String parseAndFormatDate(String raw) {
        if (raw == null || raw.isEmpty()) return "--";
        for (SimpleDateFormat fmt : DATE_FORMATS) {
            try {
                Date d = fmt.parse(raw);
                if (d != null) return DISPLAY_FMT.format(d);
            } catch (ParseException ignored) {
            }
        }
        String s = raw.length() > 16 ? raw.substring(0, 16) : raw;
        return s.replace("T", "  ");
    }

    // ── Result row model ─────────────────────────────────────────────────────

    private static class ResultRow {
        final String label;
        final String value;
        final String reference;
        final String flag;

        ResultRow(String label, String value, String reference, String flag) {
            this.label     = label;
            this.value     = value;
            this.reference = reference;
            this.flag      = flag;
        }
    }

    /**
     * Parse a result JSONObject into display rows.
     * Handles two server shapes:
     *   Flat:   { "WBC": "10.5 K/uL" }
     *   Nested: { "WBC": { "value":"10.5","unit":"K/uL","flag":"H","reference":"4-11" } }
     */
    private List<ResultRow> parseResultRows(JSONObject result) {
        List<ResultRow> rows = new ArrayList<>();
        if (result == null) return rows;

        Iterator<String> keys = result.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            if (key.startsWith("_") || key.equals("id") || key.equals("__v")) continue;

            Object raw = result.opt(key);
            if (raw == null) continue;

            String label = humanise(key);

            if (raw instanceof JSONObject) {
                JSONObject obj = (JSONObject) raw;
                String val  = obj.optString("value",  obj.optString("result", ""));
                String unit = obj.optString("unit",   obj.optString("units",  ""));
                String ref  = obj.optString("reference",
                             obj.optString("normalRange",
                             obj.optString("range", "")));
                String flag = obj.optString("flag",
                             obj.optString("status", "")).toUpperCase();

                // Single-key object fallback
                if (val.isEmpty() && obj.length() == 1) {
                    val = String.valueOf(obj.opt(obj.keys().next()));
                }

                String displayValue = val.isEmpty() ? "--"
                        : unit.isEmpty() ? val
                        : val + "  " + unit;

                rows.add(new ResultRow(label, displayValue, ref, flag));

            } else if (raw instanceof JSONArray) {
                JSONArray arr = (JSONArray) raw;
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < arr.length(); i++) {
                    if (sb.length() > 0) sb.append(", ");
                    sb.append(arr.opt(i));
                }
                rows.add(new ResultRow(label, sb.toString(), "", ""));

            } else {
                String val = raw.toString().trim();
                if (!val.isEmpty()) {
                    rows.add(new ResultRow(label, val, "", ""));
                }
            }
        }
        return rows;
    }

    /** CamelCase / snake_case → "Human Readable Label" */
    private String humanise(String key) {
        String s = key.replace("_", " ").replace("-", " ");
        s = s.replaceAll("([a-z])([A-Z])", "$1 $2");
        if (!s.isEmpty()) {
            s = Character.toUpperCase(s.charAt(0)) + s.substring(1);
        }
        return s;
    }

    /** Color for value text based on flag. */
    private int flagColor(String flag) {
        if (flag == null || flag.isEmpty()) return 0xFFCBD5E1;
        switch (flag.toUpperCase()) {
            case "H": case "HIGH": case "HH":       return 0xFFF87171; // red
            case "L": case "LOW":  case "LL":       return 0xFF60A5FA; // blue
            case "C": case "CRITICAL": case "PANIC": return 0xFFFF4444; // bright red
            case "N": case "NORMAL": case "WNL":    return 0xFF4ADE80; // green
            default:                                return 0xFFCBD5E1; // default
        }
    }

    /** Arrow indicator appended to value. */
    private String flagArrow(String flag) {
        if (flag == null || flag.isEmpty()) return "";
        switch (flag.toUpperCase()) {
            case "H": case "HIGH":  case "HH":           return " ↑";
            case "L": case "LOW":   case "LL":           return " ↓";
            case "C": case "CRITICAL": case "PANIC":     return " ‼";
            default: return "";
        }
    }

    // ── Adapter API ──────────────────────────────────────────────────────────

    public void setInvestigations(JSONArray investigations) {
        this.investigations = investigations;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_investigation, parent, false);
        return new ViewHolder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        JSONObject inv = investigations.optJSONObject(position);
        if (inv == null) return;

        Context ctx = holder.itemView.getContext();

        holder.textType.setText(inv.optString("type", "UNKNOWN").toUpperCase());
        String rawDate = inv.optString("conductedAt", inv.optString("createdAt", ""));
        holder.textDate.setText(parseAndFormatDate(rawDate));
        holder.textTitle.setText(inv.optString("title", "Unnamed Study"));

        // View Report button — check result object for imageUrl/fileUrl
        JSONObject resultForUrl = inv.optJSONObject("result");
        String reportUrl = "";
        if (resultForUrl != null) {
            reportUrl = resultForUrl.optString("imageUrl",
                        resultForUrl.optString("fileUrl",
                        resultForUrl.optString("pdfUrl",
                        resultForUrl.optString("url", ""))));
        }
        if (reportUrl.isEmpty()) {
            reportUrl = inv.optString("fileUrl", inv.optString("imageUrl", ""));
        }
        final String finalReportUrl = reportUrl;
        if (!finalReportUrl.isEmpty()) {
            holder.btnViewReport.setVisibility(View.VISIBLE);
            holder.btnViewReport.setOnClickListener(v -> {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(finalReportUrl));
                ctx.startActivity(intent);
            });
        } else {
            holder.btnViewReport.setVisibility(View.GONE);
        }

        // Clear previous rows (critical for RecyclerView view reuse)
        holder.layoutResultRows.removeAllViews();

        JSONObject resultObj = inv.optJSONObject("result");
        List<ResultRow> rows = parseResultRows(resultObj);

        if (!rows.isEmpty()) {
            // ── Structured table ──────────────────────────────────────────
            holder.divider.setVisibility(View.VISIBLE);
            holder.layoutHeader.setVisibility(View.VISIBLE);
            holder.layoutResultRows.setVisibility(View.VISIBLE);
            holder.textResult.setVisibility(View.GONE);

            for (int i = 0; i < rows.size(); i++) {
                ResultRow row = rows.get(i);

                LinearLayout rowLayout = new LinearLayout(ctx);
                rowLayout.setOrientation(LinearLayout.HORIZONTAL);
                rowLayout.setPadding(0, 8, 0, 8);

                boolean isFlagged = !row.flag.isEmpty() && !row.flag.equalsIgnoreCase("N")
                        && !row.flag.equalsIgnoreCase("NORMAL") && !row.flag.equalsIgnoreCase("WNL");

                // Label column (weight 2)
                TextView tvLabel = new TextView(ctx);
                tvLabel.setText(row.label);
                tvLabel.setTextColor(0xFFE2E8F0);
                tvLabel.setTextSize(14f);
                tvLabel.setTypeface(null, Typeface.BOLD);
                tvLabel.setLayoutParams(new LinearLayout.LayoutParams(0,
                        ViewGroup.LayoutParams.WRAP_CONTENT, 2f));

                // Value column — colored by flag (weight 2), bolder when flagged
                TextView tvValue = new TextView(ctx);
                tvValue.setText(row.value + flagArrow(row.flag));
                tvValue.setTextColor(flagColor(row.flag));
                tvValue.setTextSize(isFlagged ? 15f : 14f);
                tvValue.setTypeface(null, isFlagged ? Typeface.BOLD : Typeface.NORMAL);
                tvValue.setLayoutParams(new LinearLayout.LayoutParams(0,
                        ViewGroup.LayoutParams.WRAP_CONTENT, 2f));

                // Reference range column (weight 2, end-aligned, muted)
                TextView tvRef = new TextView(ctx);
                tvRef.setText(row.reference);
                tvRef.setTextColor(0xFF64748B);
                tvRef.setTextSize(12f);
                tvRef.setGravity(android.view.Gravity.END);
                tvRef.setLayoutParams(new LinearLayout.LayoutParams(0,
                        ViewGroup.LayoutParams.WRAP_CONTENT, 2f));

                rowLayout.addView(tvLabel);
                rowLayout.addView(tvValue);
                rowLayout.addView(tvRef);
                holder.layoutResultRows.addView(rowLayout);

                // Thin separator between rows (not after last)
                if (i < rows.size() - 1) {
                    View sep = new View(ctx);
                    sep.setBackgroundColor(0x1AFFFFFF);
                    sep.setLayoutParams(new LinearLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT, 1));
                    holder.layoutResultRows.addView(sep);
                }
            }

        } else {
            // ── Plain text fallback ───────────────────────────────────────
            holder.divider.setVisibility(View.GONE);
            holder.layoutHeader.setVisibility(View.GONE);
            holder.layoutResultRows.setVisibility(View.GONE);

            String impression = inv.optString("impression", "");
            String notes      = inv.optString("notes", "");

            String display = !impression.isEmpty() ? "Impression:\n" + impression
                           : !notes.isEmpty()      ? notes
                           : "";

            if (!display.isEmpty()) {
                holder.textResult.setText(display);
                holder.textResult.setVisibility(View.VISIBLE);
            } else {
                holder.textResult.setVisibility(View.GONE);
            }
        }
    }

    @Override
    public int getItemCount() {
        return investigations.length();
    }

    // ── ViewHolder ───────────────────────────────────────────────────────────

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView     textType, textDate, textTitle, textResult;
        Button       btnViewReport;
        View         divider;
        LinearLayout layoutHeader, layoutResultRows;

        ViewHolder(View itemView) {
            super(itemView);
            textType         = itemView.findViewById(R.id.textInvType);
            textDate         = itemView.findViewById(R.id.textInvDate);
            textTitle        = itemView.findViewById(R.id.textInvTitle);
            textResult       = itemView.findViewById(R.id.textInvResult);
            btnViewReport    = itemView.findViewById(R.id.btnViewReport);
            divider          = itemView.findViewById(R.id.dividerResult);
            layoutHeader     = itemView.findViewById(R.id.layoutResultHeader);
            layoutResultRows = itemView.findViewById(R.id.layoutResultRows);
        }
    }
}
