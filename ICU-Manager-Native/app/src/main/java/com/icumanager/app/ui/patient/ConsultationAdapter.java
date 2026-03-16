package com.icumanager.app.ui.patient;

import android.content.Context;
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
import java.util.TimeZone;

public class ConsultationAdapter extends RecyclerView.Adapter<ConsultationAdapter.ViewHolder> {

    private JSONArray consultations = new JSONArray();

    public void setConsultations(JSONArray consultations) {
        this.consultations = consultations;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_consultation, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        JSONObject c = consultations.optJSONObject(position);
        if (c == null) return;

        String specialty = c.optString("specialty", "—");
        String doctorName = c.optString("doctorName", "—");
        String notes = c.optString("notes", "");
        String timestamp = c.optString("timestamp", c.optString("createdAt", ""));

        holder.textSpecialty.setText(specialty + " Consultation");
        holder.textDoctor.setText("Dr. " + doctorName);
        holder.textNotes.setText(notes.isEmpty() ? "No notes provided." : notes);

        if (!timestamp.isEmpty()) {
            holder.textTime.setText(formatTimestamp(timestamp));
        } else {
            holder.textTime.setText("");
        }

        boolean hasImage = !c.optString("imageUrl", "").isEmpty();
        holder.textHasImage.setVisibility(hasImage ? View.VISIBLE : View.GONE);
    }

    @Override
    public int getItemCount() {
        return consultations.length();
    }

    private String formatTimestamp(String ts) {
        try {
            SimpleDateFormat input = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            input.setTimeZone(TimeZone.getTimeZone("UTC"));
            Date date = input.parse(ts);
            SimpleDateFormat output = new SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.US);
            return output.format(date);
        } catch (Exception e) {
            if (ts.length() >= 16) return ts.substring(0, 16).replace("T", " ");
            return ts;
        }
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView textSpecialty, textDoctor, textNotes, textTime, textHasImage;

        ViewHolder(View v) {
            super(v);
            textSpecialty = v.findViewById(R.id.textConsultSpecialty);
            textDoctor = v.findViewById(R.id.textConsultDoctor);
            textNotes = v.findViewById(R.id.textConsultNotes);
            textTime = v.findViewById(R.id.textConsultTime);
            textHasImage = v.findViewById(R.id.textConsultHasImage);
        }
    }
}
