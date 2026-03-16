package com.icumanager.app.ui.patient;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
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
import java.util.concurrent.atomic.AtomicInteger;

public class OverviewFragment extends Fragment {
    private static final String ARG_PATIENT_ID = "patient_id";
    private String patientId;

    // Vitals card
    private TextView textVitalsBP, textVitalsHR, textVitalsSpo2, textVitalsTime, textVitalsDelayed;
    // Balance card
    private TextView textBalance, textTotalIn, textTotalOut;
    private ProgressBar progressBalance;
    // Active support
    private LinearLayout layoutActiveSupport;
    private TextView textNoSupport;
    // Abnormal alert
    private LinearLayout layoutAbnormalAlert;
    private TextView textAbnormalDetail;
    // Clinical info
    private TextView textOverviewDiagnosis, textOverviewComorbidities, textOverviewAdmitted, textOverviewDoctor;
    // Timeline
    private RecyclerView recyclerTimeline;
    private TextView textNoTimeline;
    private TimelineAdapter timelineAdapter;

    public static OverviewFragment newInstance(String patientId) {
        OverviewFragment f = new OverviewFragment();
        Bundle args = new Bundle();
        args.putString(ARG_PATIENT_ID, patientId);
        f.setArguments(args);
        return f;
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getArguments() != null) patientId = getArguments().getString(ARG_PATIENT_ID);
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_overview, container, false);

        textVitalsBP       = view.findViewById(R.id.textVitalsBP);
        textVitalsHR       = view.findViewById(R.id.textVitalsHR);
        textVitalsSpo2     = view.findViewById(R.id.textVitalsSpo2);
        textVitalsTime     = view.findViewById(R.id.textVitalsTime);
        textVitalsDelayed  = view.findViewById(R.id.textVitalsDelayed);
        textBalance        = view.findViewById(R.id.textBalance);
        textTotalIn        = view.findViewById(R.id.textTotalIn);
        textTotalOut       = view.findViewById(R.id.textTotalOut);
        progressBalance    = view.findViewById(R.id.progressBalance);
        layoutActiveSupport= view.findViewById(R.id.layoutActiveSupport);
        textNoSupport      = view.findViewById(R.id.textNoSupport);
        layoutAbnormalAlert= view.findViewById(R.id.layoutAbnormalAlert);
        textAbnormalDetail = view.findViewById(R.id.textAbnormalDetail);
        textOverviewDiagnosis    = view.findViewById(R.id.textOverviewDiagnosis);
        textOverviewComorbidities= view.findViewById(R.id.textOverviewComorbidities);
        textOverviewAdmitted     = view.findViewById(R.id.textOverviewAdmitted);
        textOverviewDoctor       = view.findViewById(R.id.textOverviewDoctor);
        recyclerTimeline   = view.findViewById(R.id.recyclerTimeline);
        textNoTimeline     = view.findViewById(R.id.textNoTimeline);

        timelineAdapter = new TimelineAdapter();
        recyclerTimeline.setLayoutManager(new LinearLayoutManager(getContext()));
        recyclerTimeline.setAdapter(timelineAdapter);
        recyclerTimeline.setNestedScrollingEnabled(false);

        loadAll();
        return view;
    }

    private String getToken() {
        if (getActivity() == null) return null;
        SharedPreferences prefs = getActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        return prefs.getString("auth_token", null);
    }

    private void loadAll() {
        String token = getToken();
        if (token == null) return;

        // 1. Patient info
        ApiClient.get("/patients/" + patientId, token, new ApiClient.ApiCallback() {
            @Override public void onSuccess(String r) { if (getActivity() != null) getActivity().runOnUiThread(() -> bindPatient(r)); }
            @Override public void onError(Exception e) {}
        });

        // 2. Latest vitals
        ApiClient.get("/vitals/" + patientId, token, new ApiClient.ApiCallback() {
            @Override public void onSuccess(String r) { if (getActivity() != null) getActivity().runOnUiThread(() -> bindVitals(r)); }
            @Override public void onError(Exception e) {}
        });

        // 3. I/O for last 12 hours
        ApiClient.get("/io/" + patientId, token, new ApiClient.ApiCallback() {
            @Override public void onSuccess(String r) { if (getActivity() != null) getActivity().runOnUiThread(() -> bindIO(r)); }
            @Override public void onError(Exception e) {}
        });

        // 4. Medications for active infusions
        ApiClient.get("/medications/" + patientId + "/mar", token, new ApiClient.ApiCallback() {
            @Override public void onSuccess(String r) { if (getActivity() != null) getActivity().runOnUiThread(() -> bindSupport(r)); }
            @Override public void onError(Exception e) {}
        });

        // 5. Investigations for abnormal check
        ApiClient.get("/investigations/" + patientId, token, new ApiClient.ApiCallback() {
            @Override public void onSuccess(String r) { if (getActivity() != null) getActivity().runOnUiThread(() -> bindAbnormalLabs(r)); }
            @Override public void onError(Exception e) {}
        });

        // 6. Timeline
        ApiClient.get("/patients/" + patientId + "/timeline", token, new ApiClient.ApiCallback() {
            @Override public void onSuccess(String r) { if (getActivity() != null) getActivity().runOnUiThread(() -> bindTimeline(r)); }
            @Override public void onError(Exception e) { if (getActivity() != null) getActivity().runOnUiThread(() -> textNoTimeline.setVisibility(View.VISIBLE)); }
        });
    }

    // ── Patient info ──────────────────────────────────────────────────────────
    private void bindPatient(String responseStr) {
        try {
            JSONObject patient = new JSONObject(responseStr);
            textOverviewDiagnosis.setText(patient.optString("diagnosis", "Not recorded"));

            JSONArray comorbArray = patient.optJSONArray("comorbidities");
            if (comorbArray != null && comorbArray.length() > 0) {
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < comorbArray.length(); i++) {
                    if (i > 0) sb.append(", ");
                    sb.append(comorbArray.optString(i));
                }
                textOverviewComorbidities.setText(sb.toString());
            } else {
                textOverviewComorbidities.setText("None recorded");
                textOverviewComorbidities.setTextColor(Color.parseColor("#64748B"));
            }

            try {
                String dateStr = patient.optString("createdAt");
                SimpleDateFormat apiFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                SimpleDateFormat displayFormat = new SimpleDateFormat("MMM dd, yyyy", Locale.US);
                Date date = apiFormat.parse(dateStr);
                textOverviewAdmitted.setText(date != null ? displayFormat.format(date) : dateStr);
            } catch (Exception e) {
                textOverviewAdmitted.setText(patient.optString("createdAt", "--"));
            }

            JSONArray admissions = patient.optJSONArray("admissions");
            if (admissions != null) {
                for (int i = 0; i < admissions.length(); i++) {
                    JSONObject adm = admissions.optJSONObject(i);
                    if (adm != null && (adm.isNull("dischargedAt") || adm.optString("dischargedAt").isEmpty())) {
                        JSONObject doc = adm.optJSONObject("doctor");
                        textOverviewDoctor.setText(doc != null ? "Dr. " + doc.optString("name", "Unknown") : "Not assigned");
                        break;
                    }
                }
            }
        } catch (Exception ignored) {}
    }

    // ── Vitals ────────────────────────────────────────────────────────────────
    private void bindVitals(String responseStr) {
        try {
            JSONArray arr = new JSONArray(responseStr);
            if (arr.length() == 0) {
                textVitalsTime.setText("No records");
                textVitalsDelayed.setVisibility(View.VISIBLE);
                return;
            }
            JSONObject last = arr.optJSONObject(arr.length() - 1);
            if (last == null) return;

            int sys = last.optInt("bpSys", 0);
            int dia = last.optInt("bpDia", 0);
            int hr  = last.optInt("heartRate", 0);
            int spo2= last.optInt("spo2", 0);
            String ts = last.optString("timestamp", "");

            textVitalsBP.setText(sys + "/" + dia + " mmHg");
            textVitalsHR.setText("HR: " + hr);
            textVitalsSpo2.setText("SpO2: " + spo2 + "%");

            // Check delay > 30 min
            boolean delayed = true;
            try {
                SimpleDateFormat fmt = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                Date d = fmt.parse(ts);
                if (d != null) {
                    long diffMin = (System.currentTimeMillis() - d.getTime()) / 60000;
                    delayed = diffMin > 30;
                    String time = ts.length() >= 16 ? ts.substring(11, 16) : "";
                    textVitalsTime.setText(time);
                }
            } catch (Exception ignored) {}

            textVitalsDelayed.setVisibility(delayed ? View.VISIBLE : View.GONE);
        } catch (Exception ignored) {}
    }

    // ── I/O (last 12 h) ───────────────────────────────────────────────────────
    private void bindIO(String responseStr) {
        try {
            JSONArray arr = new JSONArray(responseStr);
            long cutoff = System.currentTimeMillis() - 12L * 3600 * 1000;
            SimpleDateFormat fmt = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);

            int totalIn = 0, totalOut = 0;
            for (int i = 0; i < arr.length(); i++) {
                JSONObject e = arr.optJSONObject(i);
                if (e == null) continue;
                String ts = e.optString("timestamp", "");
                try {
                    Date d = fmt.parse(ts);
                    if (d != null && d.getTime() < cutoff) continue;
                } catch (Exception ignored) {}
                int amt = e.optInt("amount", 0);
                if ("INPUT".equals(e.optString("type"))) totalIn += amt;
                else totalOut += amt;
            }

            int balance = totalIn - totalOut;
            String prefix = balance > 0 ? "+" : "";
            textBalance.setText(prefix + balance + " mL");
            textBalance.setTextColor(Color.parseColor(balance >= 0 ? "#34D399" : "#F87171"));
            textTotalIn.setText("In: " + totalIn);
            textTotalOut.setText("Out: " + totalOut);

            int total = totalIn + totalOut;
            int progress = total > 0 ? (int) ((totalIn * 100.0) / total) : 50;
            progressBalance.setProgress(progress);
        } catch (Exception ignored) {}
    }

    // ── Active infusion support ───────────────────────────────────────────────
    private void bindSupport(String responseStr) {
        try {
            JSONArray meds = new JSONArray(responseStr);
            layoutActiveSupport.removeAllViews();
            int count = 0;
            for (int i = 0; i < meds.length(); i++) {
                JSONObject med = meds.optJSONObject(i);
                if (med == null) continue;
                boolean active = med.optBoolean("isActive", false);
                String rate = med.optString("infusionRate", "");
                if (!active || rate.isEmpty()) continue;
                if (count >= 4) break;

                String name     = med.optString("name", "Medication");
                String dose     = med.optString("defaultDose", "");
                String startedAt= med.optString("startedAt", "");
                int day = 1;
                try {
                    SimpleDateFormat fmt = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                    Date d = fmt.parse(startedAt);
                    if (d != null) day = (int) ((System.currentTimeMillis() - d.getTime()) / 86400000L) + 1;
                } catch (Exception ignored) {}

                View row = LayoutInflater.from(getContext()).inflate(android.R.layout.simple_list_item_2, layoutActiveSupport, false);
                TextView line1 = row.findViewById(android.R.id.text1);
                TextView line2 = row.findViewById(android.R.id.text2);
                line1.setText(name + "  [Day " + day + "]");
                line1.setTextColor(Color.parseColor("#FCD34D"));
                line2.setText(dose + "  @  " + rate);
                line2.setTextColor(Color.parseColor("#94A3B8"));
                layoutActiveSupport.addView(row);
                count++;
            }
            textNoSupport.setVisibility(count == 0 ? View.VISIBLE : View.GONE);
        } catch (Exception ignored) {}
    }

    // ── Abnormal labs ─────────────────────────────────────────────────────────
    private void bindAbnormalLabs(String responseStr) {
        try {
            JSONArray arr;
            try { arr = new JSONArray(responseStr); }
            catch (Exception e) { arr = new JSONObject(responseStr).optJSONArray("data"); }
            if (arr == null) return;

            StringBuilder names = new StringBuilder();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject inv = arr.optJSONObject(i);
                if (inv == null) continue;
                if (!"LAB".equals(inv.optString("type"))) continue;
                JSONObject result = inv.optJSONObject("result");
                if (result == null) continue;
                boolean hasAbnormal = false;
                java.util.Iterator<String> keys = result.keys();
                while (keys.hasNext()) {
                    String k = keys.next();
                    Object val = result.opt(k);
                    if (val instanceof JSONObject) {
                        JSONObject vo = (JSONObject) val;
                        if (vo.optBoolean("isAbnormal", false)) { hasAbnormal = true; break; }
                    }
                }
                if (hasAbnormal) {
                    if (names.length() > 0) names.append(", ");
                    names.append(inv.optString("title", "Lab"));
                }
            }

            if (names.length() > 0) {
                layoutAbnormalAlert.setVisibility(View.VISIBLE);
                textAbnormalDetail.setText("Abnormal values in: " + names);
            } else {
                layoutAbnormalAlert.setVisibility(View.GONE);
            }
        } catch (Exception ignored) {}
    }

    // ── Timeline ──────────────────────────────────────────────────────────────
    private void bindTimeline(String responseStr) {
        try {
            JSONArray arr = new JSONArray(responseStr);
            if (arr.length() == 0) {
                textNoTimeline.setVisibility(View.VISIBLE);
                recyclerTimeline.setVisibility(View.GONE);
            } else {
                // Show last 10 events
                JSONArray slice = new JSONArray();
                for (int i = 0; i < Math.min(arr.length(), 10); i++) slice.put(arr.get(i));
                timelineAdapter.setItems(slice);
                textNoTimeline.setVisibility(View.GONE);
                recyclerTimeline.setVisibility(View.VISIBLE);
            }
        } catch (Exception e) {
            textNoTimeline.setVisibility(View.VISIBLE);
            recyclerTimeline.setVisibility(View.GONE);
        }
    }
}
