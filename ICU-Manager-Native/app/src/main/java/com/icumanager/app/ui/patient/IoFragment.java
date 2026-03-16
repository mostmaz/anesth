package com.icumanager.app.ui.patient;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.cardview.widget.CardView;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import android.app.Activity;
import android.content.Intent;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;
import org.json.JSONArray;
import org.json.JSONObject;

public class IoFragment extends Fragment {
    private static final String ARG_PATIENT_ID = "patient_id";
    private String patientId;
    private IoAdapter adapter;

    // Summary card views
    private TextView textTotalInput;
    private TextView textTotalOutput;
    private TextView textIoSummary;   // Net balance value
    private TextView textBalanceLabel;
    private CardView cardNetBalance;

    public static IoFragment newInstance(String patientId) {
        IoFragment fragment = new IoFragment();
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
        View view = inflater.inflate(R.layout.fragment_io, container, false);

        // Bind summary card views
        textTotalInput  = view.findViewById(R.id.textTotalInput);
        textTotalOutput = view.findViewById(R.id.textTotalOutput);
        textIoSummary   = view.findViewById(R.id.textIoSummary);
        textBalanceLabel = view.findViewById(R.id.textBalanceLabel);
        cardNetBalance  = view.findViewById(R.id.cardNetBalance);

        RecyclerView recyclerView = view.findViewById(R.id.recyclerViewIo);
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new IoAdapter();
        recyclerView.setAdapter(adapter);

        FloatingActionButton fab = view.findViewById(R.id.fabAddIo);
        fab.setOnClickListener(v -> {
            Intent intent = new Intent(getActivity(), AddIoActivity.class);
            intent.putExtra("patient_id", patientId);
            startActivityForResult(intent, 200);
        });

        loadIoHistory();

        return view;
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 200 && resultCode == Activity.RESULT_OK) {
            loadIoHistory();
        }
    }

    private void loadIoHistory() {
        if (getActivity() == null) return;

        SharedPreferences prefs = getActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        ApiClient.get("/io/" + patientId, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        try {
                            JSONArray history = new JSONArray(responseStr);

                            int totalIn  = 0;
                            int totalOut = 0;

                            for (int i = 0; i < history.length(); i++) {
                                JSONObject entry = history.optJSONObject(i);
                                if (entry != null) {
                                    int amt = entry.optInt("amount", 0);
                                    if ("INPUT".equals(entry.optString("type"))) {
                                        totalIn += amt;
                                    } else {
                                        totalOut += amt;
                                    }
                                }
                            }

                            int balance = totalIn - totalOut;
                            updateSummaryCards(totalIn, totalOut, balance);
                            adapter.setEntries(history);

                        } catch (Exception e) {
                            Toast.makeText(getContext(), "Failed to parse I/O data", Toast.LENGTH_SHORT).show();
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

    private void updateSummaryCards(int totalIn, int totalOut, int balance) {
        // Total Input — always blue
        textTotalInput.setText(totalIn + " mL");

        // Total Output — always amber
        textTotalOutput.setText(totalOut + " mL");

        // Net Balance — green if >= 0, red if negative
        String prefix = balance > 0 ? "+" : "";
        textIoSummary.setText(prefix + balance + " mL");

        if (balance >= 0) {
            // Green theme
            cardNetBalance.setCardBackgroundColor(Color.parseColor("#0D2E1A"));
            textBalanceLabel.setTextColor(Color.parseColor("#34D399"));
            textIoSummary.setTextColor(Color.parseColor("#6EE7B7"));
        } else {
            // Red theme
            cardNetBalance.setCardBackgroundColor(Color.parseColor("#2D0F0F"));
            textBalanceLabel.setTextColor(Color.parseColor("#F87171"));
            textIoSummary.setTextColor(Color.parseColor("#FCA5A5"));
        }
    }
}
