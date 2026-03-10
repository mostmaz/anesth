package com.icumanager.app.ui.reports;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class ShiftHistoryActivity extends AppCompatActivity {

    private RecyclerView recyclerView;
    private ShiftAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_shift_history);

        findViewById(R.id.toolbarShiftHistory).setOnClickListener(v -> finish());

        recyclerView = findViewById(R.id.recyclerViewShiftHistory);
        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        adapter = new ShiftAdapter();
        recyclerView.setAdapter(adapter);

        loadHistory();
    }

    private void loadHistory() {
        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        ApiClient.get("/shifts/history", token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                runOnUiThread(() -> {
                    try {
                        JSONObject response = new JSONObject(responseStr);
                        JSONArray array = response.getJSONObject("data").getJSONArray("shifts");
                        adapter.setShifts(array);
                    } catch (Exception e) {
                        Toast.makeText(ShiftHistoryActivity.this, "Error parsing history", Toast.LENGTH_SHORT).show();
                    }
                });
            }

            @Override
            public void onError(Exception error) {
                runOnUiThread(() -> Toast
                        .makeText(ShiftHistoryActivity.this, "Failed to load history", Toast.LENGTH_SHORT).show());
            }
        });
    }

    private class ShiftAdapter extends RecyclerView.Adapter<ShiftAdapter.ViewHolder> {
        private JSONArray shifts = new JSONArray();

        public void setShifts(JSONArray shifts) {
            this.shifts = shifts;
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            return new ViewHolder(LayoutInflater.from(parent.getContext()).inflate(R.layout.item_shift, parent, false));
        }

        @Override
        public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
            JSONObject s = shifts.optJSONObject(position);
            if (s == null)
                return;

            holder.type.setText(s.optString("type", "Shift"));
            holder.status.setText(s.optString("status"));

            JSONObject user = s.optJSONObject("user");
            if (user != null) {
                holder.nurse.setText("Nurse: " + user.optString("name"));
                holder.nurse.setVisibility(View.VISIBLE);
            } else {
                holder.nurse.setVisibility(View.GONE);
            }

            String start = s.optString("startTime");
            String end = s.optString("endTime", "Ongoing");

            holder.time.setText("Started: " + formatTime(start) + "\nEnded: " + formatTime(end));
        }

        private String formatTime(String t) {
            if (t == null || t.isEmpty() || t.equals("Ongoing"))
                return t;
            try {
                // Assuming ISO format from server
                if (t.contains("T")) {
                    return t.split("\\.")[0].replace("T", " ");
                }
            } catch (Exception ignored) {
            }
            return t;
        }

        @Override
        public int getItemCount() {
            return shifts.length();
        }

        class ViewHolder extends RecyclerView.ViewHolder {
            TextView type, status, nurse, time;

            ViewHolder(View v) {
                super(v);
                type = v.findViewById(R.id.textShiftType);
                status = v.findViewById(R.id.textShiftStatus);
                nurse = v.findViewById(R.id.textShiftNurse);
                time = v.findViewById(R.id.textShiftTime);
            }
        }
    }
}
