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

public class NotesAdapter extends RecyclerView.Adapter<NotesAdapter.ViewHolder> {
    private JSONArray notes = new JSONArray();
    private SimpleDateFormat inputFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
    private SimpleDateFormat displayFormat = new SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.US);

    public void setNotes(JSONArray notes) {
        this.notes = notes;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_note, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        JSONObject note = notes.optJSONObject(position);
        if (note != null) {
            String content = note.optString("content", "");
            JSONObject user = note.optJSONObject("User");
            String authorName = user != null ? user.optString("name", "Unknown") : "Unknown";
            String role = user != null ? user.optString("role", "") : "";

            holder.textContent.setText(content);
            holder.textAuthor.setText(authorName);
            holder.textRole.setText(role);

            try {
                String timestamp = note.optString("createdAt", "");
                if (!timestamp.isEmpty()) {
                    Date date = inputFormat.parse(timestamp);
                    if (date != null) {
                        holder.textTime.setText(displayFormat.format(date));
                    }
                }
            } catch (Exception e) {
                holder.textTime.setText("");
            }
        }
    }

    @Override
    public int getItemCount() {
        return notes.length();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView textAuthor;
        TextView textRole;
        TextView textTime;
        TextView textContent;

        ViewHolder(View view) {
            super(view);
            textAuthor = view.findViewById(R.id.textNoteAuthor);
            textRole = view.findViewById(R.id.textNoteRole);
            textTime = view.findViewById(R.id.textNoteTime);
            textContent = view.findViewById(R.id.textNoteContent);
        }
    }
}
