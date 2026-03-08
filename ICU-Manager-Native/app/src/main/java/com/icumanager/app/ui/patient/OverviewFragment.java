package com.icumanager.app.ui.patient;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;
import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class OverviewFragment extends Fragment {
    private static final String ARG_PATIENT_ID = "patient_id";
    private String patientId;

    private TextView textDiagnosis;
    private TextView textComorbidities;
    private TextView textAdmitted;
    private TextView textDoctor;

    public static OverviewFragment newInstance(String patientId) {
        OverviewFragment fragment = new OverviewFragment();
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
        View view = inflater.inflate(R.layout.fragment_overview, container, false);

        textDiagnosis = view.findViewById(R.id.textOverviewDiagnosis);
        textComorbidities = view.findViewById(R.id.textOverviewComorbidities);
        textAdmitted = view.findViewById(R.id.textOverviewAdmitted);
        textDoctor = view.findViewById(R.id.textOverviewDoctor);

        loadPatientDetails();

        return view;
    }

    private void loadPatientDetails() {
        if (getActivity() == null)
            return;

        SharedPreferences prefs = getActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        ApiClient.get("/patients/" + patientId, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        try {
                            JSONObject patient = new JSONObject(responseStr);

                            textDiagnosis.setText(patient.optString("diagnosis", "Not recorded"));

                            JSONArray comorbArray = patient.optJSONArray("comorbidities");
                            if (comorbArray != null && comorbArray.length() > 0) {
                                StringBuilder sb = new StringBuilder();
                                for (int i = 0; i < comorbArray.length(); i++) {
                                    sb.append(comorbArray.optString(i));
                                    if (i < comorbArray.length() - 1)
                                        sb.append(", ");
                                }
                                textComorbidities.setText(sb.toString());
                            } else {
                                textComorbidities.setText("None recorded");
                            }

                            try {
                                String dateStr = patient.optString("createdAt");
                                SimpleDateFormat apiFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                                        Locale.US);
                                SimpleDateFormat displayFormat = new SimpleDateFormat("MMM dd, yyyy", Locale.US);
                                Date date = apiFormat.parse(dateStr);
                                textAdmitted.setText(date != null ? displayFormat.format(date) : dateStr);
                            } catch (Exception e) {
                                textAdmitted.setText(patient.optString("createdAt", "--"));
                            }

                            JSONArray admissions = patient.optJSONArray("admissions");
                            if (admissions != null && admissions.length() > 0) {
                                JSONObject activeAdmission = null;
                                for (int i = 0; i < admissions.length(); i++) {
                                    JSONObject adm = admissions.optJSONObject(i);
                                    if (adm != null && (adm.isNull("dischargedAt")
                                            || adm.optString("dischargedAt").isEmpty())) {
                                        activeAdmission = adm;
                                        break;
                                    }
                                }

                                if (activeAdmission != null && !activeAdmission.isNull("doctor")) {
                                    JSONObject doc = activeAdmission.optJSONObject("doctor");
                                    if (doc != null) {
                                        textDoctor.setText("Dr. " + doc.optString("name", "Unknown"));
                                    } else {
                                        textDoctor.setText("Not assigned");
                                    }
                                } else {
                                    textDoctor.setText("Not assigned");
                                }
                            } else {
                                textDoctor.setText("Not assigned");
                            }

                        } catch (Exception e) {
                            Toast.makeText(getContext(), "Failed to parse Overview", Toast.LENGTH_SHORT).show();
                        }
                    });
                }
            }

            @Override
            public void onError(Exception error) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        Toast.makeText(getContext(), "Network error: " + error.getMessage(), Toast.LENGTH_SHORT).show();
                    });
                }
            }
        });
    }
}
