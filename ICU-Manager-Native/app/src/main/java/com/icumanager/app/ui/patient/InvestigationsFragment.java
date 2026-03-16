package com.icumanager.app.ui.patient;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import android.content.Intent;
import android.app.Activity;
import android.app.AlertDialog;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class InvestigationsFragment extends Fragment {
    private static final String ARG_PATIENT_ID  = "patient_id";
    private static final String ARG_FILTER_TYPE = "filter_type";

    private String patientId;
    private String filterType;
    private InvestigationsAdapter adapter;
    private JSONArray allInvestigations = new JSONArray();
    private static final String BASE_URL = "http://161.35.216.33:3001";

    public static InvestigationsFragment newInstance(String patientId, String filterType) {
        InvestigationsFragment f = new InvestigationsFragment();
        Bundle args = new Bundle();
        args.putString(ARG_PATIENT_ID, patientId);
        args.putString(ARG_FILTER_TYPE, filterType);
        f.setArguments(args);
        return f;
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getArguments() != null) {
            patientId  = getArguments().getString(ARG_PATIENT_ID);
            filterType = getArguments().getString(ARG_FILTER_TYPE);
        }
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_investigations, container, false);

        TextView header = view.findViewById(R.id.textInvestigationsHeader);
        if ("LAB".equals(filterType))          header.setText("Laboratory Results");
        else if ("IMAGING".equals(filterType)) header.setText("Radiology / Imaging");
        else                                   header.setText("Cardiology (ECG / Echo)");

        RecyclerView recyclerView = view.findViewById(R.id.recyclerViewInvestigations);
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));

        adapter = new InvestigationsAdapter(new InvestigationsAdapter.OnInvestigationActionListener() {
            @Override
            public void onViewReport(String imageUrl) { openReport(imageUrl); }
            @Override
            public void onDelete(String invId, int position) { confirmDelete(invId, position); }
        });
        recyclerView.setAdapter(adapter);

        // Search
        EditText editSearch = view.findViewById(R.id.editSearch);
        editSearch.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                filterAndDisplay(s.toString());
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        // FAB
        FloatingActionButton fab = view.findViewById(R.id.fabAddInvestigation);
        fab.setOnClickListener(v -> {
            Intent intent = new Intent(getActivity(), UploadInvestigationActivity.class);
            intent.putExtra("patient_id", patientId);
            intent.putExtra("filter_type", filterType);
            startActivityForResult(intent, 600);
        });

        loadInvestigations();
        return view;
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 600 && resultCode == Activity.RESULT_OK) loadInvestigations();
    }

    private void loadInvestigations() {
        if (getActivity() == null) return;
        SharedPreferences prefs = getActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        ApiClient.get("/investigations/" + patientId, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    try {
                        JSONArray raw;
                        try { raw = new JSONArray(responseStr); }
                        catch (Exception e) {
                            JSONObject wrapper = new JSONObject(responseStr);
                            raw = wrapper.has("data") ? wrapper.getJSONArray("data") : new JSONArray();
                        }
                        allInvestigations = raw;
                        filterAndDisplay("");
                    } catch (Exception e) {
                        Toast.makeText(getContext(), "Failed to parse: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                });
            }
            @Override
            public void onError(Exception error) {
                if (getActivity() != null)
                    getActivity().runOnUiThread(() ->
                        Toast.makeText(getContext(), "Network error: " + error.getMessage(), Toast.LENGTH_SHORT).show());
            }
        });
    }

    private void filterAndDisplay(String query) {
        try {
            JSONArray filtered = new JSONArray();
            String q = query.toLowerCase().trim();
            for (int i = 0; i < allInvestigations.length(); i++) {
                JSONObject inv = allInvestigations.optJSONObject(i);
                if (inv == null) continue;

                String type     = inv.optString("type", "").toUpperCase();
                String category = inv.optString("category", "").toLowerCase();
                String title    = inv.optString("title", "").toLowerCase();

                boolean isCardio = title.contains("ecg") || title.contains("echo") || category.contains("cardio");

                boolean matchesType;
                if ("CARDIOLOGY".equals(filterType))      matchesType = isCardio;
                else if ("IMAGING".equals(filterType))    matchesType = "IMAGING".equals(type) && !isCardio;
                else                                      matchesType = "LAB".equals(type) && !isCardio;

                if (!matchesType) continue;

                // Search filter
                if (!q.isEmpty()) {
                    String resultStr = inv.optString("result", "") + inv.optString("impression", "");
                    if (!title.contains(q) && !resultStr.toLowerCase().contains(q)) continue;
                }

                filtered.put(inv);
            }
            adapter.setInvestigations(filtered);
        } catch (Exception ignored) {}
    }

    private void openReport(String imageUrl) {
        try {
            String fullUrl = imageUrl.startsWith("http") ? imageUrl : BASE_URL + imageUrl;
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(fullUrl));
            startActivity(i);
        } catch (Exception e) {
            Toast.makeText(getContext(), "Cannot open: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private void confirmDelete(String invId, int position) {
        new AlertDialog.Builder(getActivity())
            .setTitle("Delete Investigation")
            .setMessage("Are you sure you want to delete this result? This cannot be undone.")
            .setPositiveButton("Delete", (d, w) -> deleteInvestigation(invId, position))
            .setNegativeButton("Cancel", null)
            .show();
    }

    private void deleteInvestigation(String invId, int position) {
        if (getActivity() == null) return;
        SharedPreferences prefs = getActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        ApiClient.delete("/investigations/" + invId, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String r) {
                if (getActivity() != null)
                    getActivity().runOnUiThread(() -> {
                        Toast.makeText(getContext(), "Deleted", Toast.LENGTH_SHORT).show();
                        // Remove from master list and refresh
                        try {
                            JSONArray updated = new JSONArray();
                            for (int i = 0; i < allInvestigations.length(); i++) {
                                JSONObject o = allInvestigations.optJSONObject(i);
                                if (o != null && !invId.equals(o.optString("id"))) updated.put(o);
                            }
                            allInvestigations = updated;
                        } catch (Exception ignored) {}
                        filterAndDisplay("");
                    });
            }
            @Override
            public void onError(Exception error) {
                if (getActivity() != null)
                    getActivity().runOnUiThread(() ->
                        Toast.makeText(getContext(), "Delete failed: " + error.getMessage(), Toast.LENGTH_SHORT).show());
            }
        });
    }
}
