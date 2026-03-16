package com.icumanager.app.ui.admin;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageButton;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class NurseAssignmentFragment extends Fragment {

    private RecyclerView recyclerPending, recyclerActive;
    private ProgressBar progressBar;
    private TextView textPendingEmpty, textActiveEmpty;
    private AssignmentAdapter pendingAdapter, activeAdapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_nurse_assignment, container, false);

        recyclerPending = view.findViewById(R.id.recyclerPendingAssignments);
        recyclerActive = view.findViewById(R.id.recyclerActiveAssignments);
        progressBar = view.findViewById(R.id.progressAssignments);
        textPendingEmpty = view.findViewById(R.id.textPendingEmpty);
        textActiveEmpty = view.findViewById(R.id.textActiveEmpty);

        recyclerPending.setLayoutManager(new LinearLayoutManager(getContext()));
        recyclerActive.setLayoutManager(new LinearLayoutManager(getContext()));

        pendingAdapter = new AssignmentAdapter(true, this::approveAssignment, this::rejectAssignment);
        activeAdapter = new AssignmentAdapter(false, null, null);

        recyclerPending.setAdapter(pendingAdapter);
        recyclerActive.setAdapter(activeAdapter);

        loadAssignments();
        return view;
    }

    private void loadAssignments() {
        SharedPreferences prefs = requireActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        progressBar.setVisibility(View.VISIBLE);

        // Load pending assignments
        ApiClient.get("/assignments/pending", token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    try {
                        JSONArray array = parseArray(responseStr);
                        pendingAdapter.setAssignments(array);
                        textPendingEmpty.setVisibility(array.length() == 0 ? View.VISIBLE : View.GONE);
                    } catch (Exception e) {
                        textPendingEmpty.setVisibility(View.VISIBLE);
                    }
                });
            }

            @Override
            public void onError(Exception error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    textPendingEmpty.setVisibility(View.VISIBLE);
                    Toast.makeText(getContext(), "Failed to load pending assignments", Toast.LENGTH_SHORT).show();
                });
            }
        });

        // Load active assignments
        ApiClient.get("/assignments/active", token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    try {
                        JSONArray array = parseArray(responseStr);
                        activeAdapter.setAssignments(array);
                        textActiveEmpty.setVisibility(array.length() == 0 ? View.VISIBLE : View.GONE);
                    } catch (Exception e) {
                        textActiveEmpty.setVisibility(View.VISIBLE);
                    }
                });
            }

            @Override
            public void onError(Exception error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    textActiveEmpty.setVisibility(View.VISIBLE);
                });
            }
        });
    }

    private void approveAssignment(String assignmentId) {
        SharedPreferences prefs = requireActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        try {
            JSONObject body = new JSONObject();
            body.put("status", "APPROVED");

            ApiClient.patch("/assignments/" + assignmentId + "/approve", body.toString(), token,
                    new ApiClient.ApiCallback() {
                        @Override
                        public void onSuccess(String response) {
                            if (getActivity() == null) return;
                            getActivity().runOnUiThread(() -> {
                                Toast.makeText(getContext(), "Assignment approved", Toast.LENGTH_SHORT).show();
                                loadAssignments();
                            });
                        }

                        @Override
                        public void onError(Exception error) {
                            if (getActivity() == null) return;
                            getActivity().runOnUiThread(() ->
                                    Toast.makeText(getContext(), "Failed to approve", Toast.LENGTH_SHORT).show());
                        }
                    });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void rejectAssignment(String assignmentId) {
        SharedPreferences prefs = requireActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        try {
            JSONObject body = new JSONObject();
            body.put("status", "REJECTED");

            ApiClient.patch("/assignments/" + assignmentId + "/reject", body.toString(), token,
                    new ApiClient.ApiCallback() {
                        @Override
                        public void onSuccess(String response) {
                            if (getActivity() == null) return;
                            getActivity().runOnUiThread(() -> {
                                Toast.makeText(getContext(), "Assignment rejected", Toast.LENGTH_SHORT).show();
                                loadAssignments();
                            });
                        }

                        @Override
                        public void onError(Exception error) {
                            if (getActivity() == null) return;
                            getActivity().runOnUiThread(() ->
                                    Toast.makeText(getContext(), "Failed to reject", Toast.LENGTH_SHORT).show());
                        }
                    });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private JSONArray parseArray(String responseStr) throws Exception {
        if (responseStr.trim().startsWith("[")) {
            return new JSONArray(responseStr);
        }
        JSONObject obj = new JSONObject(responseStr);
        JSONArray arr = obj.optJSONArray("data");
        return arr != null ? arr : new JSONArray();
    }

    interface ActionCallback {
        void onAction(String assignmentId);
    }

    static class AssignmentAdapter extends RecyclerView.Adapter<AssignmentAdapter.ViewHolder> {

        private JSONArray assignments = new JSONArray();
        private final boolean showActions;
        private final ActionCallback approveCallback;
        private final ActionCallback rejectCallback;

        AssignmentAdapter(boolean showActions, ActionCallback approveCallback, ActionCallback rejectCallback) {
            this.showActions = showActions;
            this.approveCallback = approveCallback;
            this.rejectCallback = rejectCallback;
        }

        void setAssignments(JSONArray assignments) {
            this.assignments = assignments;
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View view = LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_nurse_assignment, parent, false);
            return new ViewHolder(view);
        }

        @Override
        public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
            JSONObject a = assignments.optJSONObject(position);
            if (a == null) return;

            String assignmentId = a.optString("id");

            // Nurse info
            JSONObject nurse = a.optJSONObject("nurse");
            String nurseName = nurse != null ? nurse.optString("name", "Unknown") : "Unknown";

            // Patient info
            JSONObject patient = a.optJSONObject("patient");
            String patientName = patient != null ? patient.optString("name", "Unknown") : "Unknown";
            String patientMrn = patient != null ? patient.optString("mrn", "") : "";

            String timestamp = a.optString("assignedAt", a.optString("createdAt", ""));

            holder.textNurseName.setText(nurseName);
            holder.textPatientName.setText(patientName + (patientMrn.isEmpty() ? "" : " (MRN: " + patientMrn + ")"));
            holder.textTime.setText(formatTs(timestamp));

            if (showActions) {
                holder.layoutActions.setVisibility(View.VISIBLE);
                holder.btnApprove.setOnClickListener(v -> {
                    if (approveCallback != null) approveCallback.onAction(assignmentId);
                });
                holder.btnReject.setOnClickListener(v -> {
                    if (rejectCallback != null) rejectCallback.onAction(assignmentId);
                });
            } else {
                holder.layoutActions.setVisibility(View.GONE);
            }
        }

        @Override
        public int getItemCount() {
            return assignments.length();
        }

        private String formatTs(String ts) {
            try {
                SimpleDateFormat input = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                input.setTimeZone(TimeZone.getTimeZone("UTC"));
                Date date = input.parse(ts);
                return new SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.US).format(date);
            } catch (Exception e) {
                return ts.length() >= 16 ? ts.substring(0, 16).replace("T", " ") : ts;
            }
        }

        static class ViewHolder extends RecyclerView.ViewHolder {
            TextView textNurseName, textPatientName, textTime;
            View layoutActions;
            Button btnApprove, btnReject;

            ViewHolder(View v) {
                super(v);
                textNurseName = v.findViewById(R.id.textAssignNurseName);
                textPatientName = v.findViewById(R.id.textAssignPatient);
                textTime = v.findViewById(R.id.textAssignTime);
                layoutActions = v.findViewById(R.id.layoutAssignActions);
                btnApprove = v.findViewById(R.id.btnApproveAssignment);
                btnReject = v.findViewById(R.id.btnRejectAssignment);
            }
        }
    }
}
