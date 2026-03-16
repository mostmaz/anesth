package com.icumanager.app.ui.patient;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import android.content.Intent;
import android.app.Activity;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import com.github.mikephil.charting.charts.LineChart;
import com.github.mikephil.charting.components.XAxis;
import com.github.mikephil.charting.components.YAxis;
import com.github.mikephil.charting.data.Entry;
import com.github.mikephil.charting.data.LineData;
import com.github.mikephil.charting.data.LineDataSet;
import com.github.mikephil.charting.formatter.IndexAxisValueFormatter;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class VitalsFragment extends Fragment {
    private static final String ARG_PATIENT_ID = "patient_id";
    private String patientId;
    private VitalsAdapter adapter;

    // Chart views
    private LineChart chartHR;
    private LineChart chartSpO2;
    private LineChart chartBP;
    private LineChart chartTemp;

    public static VitalsFragment newInstance(String patientId) {
        VitalsFragment fragment = new VitalsFragment();
        Bundle args = new Bundle();
        args.putString(ARG_PATIENT_ID, patientId);
        fragment.setArguments(args);
        return fragment;
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getArguments() != null) {
            patientId = getArguments().getString(ARG_PATIENT_ID);
        }
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_vitals, container, false);

        // Bind chart views
        chartHR   = view.findViewById(R.id.chartHR);
        chartSpO2 = view.findViewById(R.id.chartSpO2);
        chartBP   = view.findViewById(R.id.chartBP);
        chartTemp = view.findViewById(R.id.chartTemp);

        setupChartStyle(chartHR);
        setupChartStyle(chartSpO2);
        setupChartStyle(chartBP);
        setupChartStyle(chartTemp);

        RecyclerView recyclerView = view.findViewById(R.id.recyclerViewVitals);
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        recyclerView.setNestedScrollingEnabled(false);
        adapter = new VitalsAdapter();
        recyclerView.setAdapter(adapter);

        FloatingActionButton fab = view.findViewById(R.id.fabAddVitals);
        fab.setOnClickListener(v -> {
            Intent intent = new Intent(getActivity(), AddVitalsActivity.class);
            intent.putExtra("patient_id", patientId);
            startActivityForResult(intent, 100);
        });

        loadVitals();

        return view;
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 100 && resultCode == Activity.RESULT_OK) {
            loadVitals();
        }
    }

    private void setupChartStyle(LineChart chart) {
        chart.setBackgroundColor(Color.TRANSPARENT);
        chart.getDescription().setEnabled(false);
        chart.setDrawGridBackground(false);
        chart.setTouchEnabled(true);
        chart.setDragEnabled(true);
        chart.setScaleEnabled(true);
        chart.setPinchZoom(true);
        chart.getLegend().setEnabled(false);
        chart.setNoDataText("No data");
        chart.setNoDataTextColor(Color.parseColor("#94A3B8"));

        XAxis xAxis = chart.getXAxis();
        xAxis.setPosition(XAxis.XAxisPosition.BOTTOM);
        xAxis.setTextColor(Color.parseColor("#94A3B8"));
        xAxis.setTextSize(9f);
        xAxis.setDrawGridLines(false);
        xAxis.setGranularity(1f);

        YAxis leftAxis = chart.getAxisLeft();
        leftAxis.setTextColor(Color.parseColor("#94A3B8"));
        leftAxis.setTextSize(9f);
        leftAxis.setDrawGridLines(true);
        leftAxis.setGridColor(Color.parseColor("#334155"));

        chart.getAxisRight().setEnabled(false);
    }

    private LineDataSet makeDataSet(List<Entry> entries, String label, int color) {
        LineDataSet ds = new LineDataSet(entries, label);
        ds.setColor(color);
        ds.setCircleColor(color);
        ds.setCircleRadius(3f);
        ds.setLineWidth(2f);
        ds.setDrawValues(false);
        ds.setMode(LineDataSet.Mode.CUBIC_BEZIER);
        ds.setDrawFilled(true);
        ds.setFillAlpha(30);
        ds.setFillColor(color);
        return ds;
    }

    private void loadVitals() {
        if (getActivity() == null) return;

        SharedPreferences prefs = getActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        ApiClient.get("/vitals/" + patientId, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        try {
                            JSONArray vitals = new JSONArray(responseStr);
                            adapter.setVitals(vitals);
                            populateCharts(vitals);
                        } catch (JSONException e) {
                            Toast.makeText(getContext(), "Failed to parse vitals", Toast.LENGTH_SHORT).show();
                        }
                    });
                }
            }

            @Override
            public void onError(Exception error) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() ->
                        Toast.makeText(getContext(), "Network error: " + error.getMessage(), Toast.LENGTH_SHORT).show()
                    );
                }
            }
        });
    }

    private void populateCharts(JSONArray vitals) {
        // Vitals come in reverse-chronological order; iterate in reverse for chart x=0 = oldest
        List<Entry> hrEntries     = new ArrayList<>();
        List<Entry> spo2Entries   = new ArrayList<>();
        List<Entry> sysBpEntries  = new ArrayList<>();
        List<Entry> diasBpEntries = new ArrayList<>();
        List<Entry> tempEntries   = new ArrayList<>();
        List<String> timeLabels   = new ArrayList<>();

        // Collect up to 20 most recent (first 20 in array = most recent), then reverse
        int count = Math.min(vitals.length(), 20);
        SimpleDateFormat sdf = new SimpleDateFormat("HH:mm", Locale.US);

        for (int i = count - 1; i >= 0; i--) {
            JSONObject v = vitals.optJSONObject(i);
            if (v == null) continue;

            float x = (count - 1 - i); // 0 = oldest displayed

            // Use same field names as VitalsAdapter (matching the actual API response)
            int hr = v.optInt("heartRate", -1);
            if (hr > 0) hrEntries.add(new Entry(x, hr));

            int spo2 = v.optInt("spo2", -1);
            if (spo2 > 0) spo2Entries.add(new Entry(x, spo2));

            int sysBp = v.optInt("bpSys", -1);
            if (sysBp > 0) sysBpEntries.add(new Entry(x, sysBp));

            int diasBp = v.optInt("bpDia", -1);
            if (diasBp > 0) diasBpEntries.add(new Entry(x, diasBp));

            double temp = v.optDouble("temp", -1);
            if (temp > 0) tempEntries.add(new Entry(x, (float) temp));

            // X-axis time label — API field is "timestamp"
            String ts = v.optString("timestamp", "");
            String label = "";
            if (!ts.isEmpty()) {
                try {
                    label = ts.length() >= 16 ? ts.substring(11, 16) : ts;
                } catch (Exception ignored) {}
            }
            timeLabels.add(label);
        }

        String[] labelsArr = timeLabels.toArray(new String[0]);

        // HR Chart
        if (!hrEntries.isEmpty()) {
            LineDataSet ds = makeDataSet(hrEntries, "HR", Color.parseColor("#F87171"));
            LineData ld = new LineData(ds);
            chartHR.getXAxis().setValueFormatter(new IndexAxisValueFormatter(labelsArr));
            chartHR.setData(ld);
            chartHR.invalidate();
        }

        // SpO2 Chart
        if (!spo2Entries.isEmpty()) {
            LineDataSet ds = makeDataSet(spo2Entries, "SpO2", Color.parseColor("#34D399"));
            chartSpO2.getAxisLeft().setAxisMinimum(80f);
            chartSpO2.getAxisLeft().setAxisMaximum(100f);
            LineData ld = new LineData(ds);
            chartSpO2.getXAxis().setValueFormatter(new IndexAxisValueFormatter(labelsArr));
            chartSpO2.setData(ld);
            chartSpO2.invalidate();
        }

        // BP Chart (two datasets)
        if (!sysBpEntries.isEmpty() || !diasBpEntries.isEmpty()) {
            List<com.github.mikephil.charting.interfaces.datasets.ILineDataSet> bpDataSets = new ArrayList<>();
            if (!sysBpEntries.isEmpty()) {
                bpDataSets.add(makeDataSet(sysBpEntries, "Systolic", Color.parseColor("#60A5FA")));
            }
            if (!diasBpEntries.isEmpty()) {
                LineDataSet diasDs = makeDataSet(diasBpEntries, "Diastolic", Color.parseColor("#A78BFA"));
                bpDataSets.add(diasDs);
            }
            chartBP.getLegend().setEnabled(true);
            chartBP.getLegend().setTextColor(Color.parseColor("#94A3B8"));
            LineData ld = new LineData(bpDataSets);
            chartBP.getXAxis().setValueFormatter(new IndexAxisValueFormatter(labelsArr));
            chartBP.setData(ld);
            chartBP.invalidate();
        }

        // Temp Chart
        if (!tempEntries.isEmpty()) {
            LineDataSet ds = makeDataSet(tempEntries, "Temp", Color.parseColor("#FCD34D"));
            chartTemp.getAxisLeft().setAxisMinimum(34f);
            chartTemp.getAxisLeft().setAxisMaximum(42f);
            LineData ld = new LineData(ds);
            chartTemp.getXAxis().setValueFormatter(new IndexAxisValueFormatter(labelsArr));
            chartTemp.setData(ld);
            chartTemp.invalidate();
        }
    }
}
