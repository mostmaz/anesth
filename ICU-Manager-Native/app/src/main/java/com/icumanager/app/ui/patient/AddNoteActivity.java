package com.icumanager.app.ui.patient;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;

import org.json.JSONException;
import org.json.JSONObject;

public class AddNoteActivity extends AppCompatActivity {

    private String patientId;
    private EditText editNoteContent;
    private Button btnSubmitNote;
    private ProgressBar progressSubmitNote;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_add_note);

        patientId = getIntent().getStringExtra("patient_id");
        if (patientId == null) {
            Toast.makeText(this, "Missing patient ID", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        Toolbar toolbar = findViewById(R.id.toolbarAddNote);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setDisplayShowHomeEnabled(true);
        }
        toolbar.setNavigationOnClickListener(v -> finish());

        editNoteContent = findViewById(R.id.editNoteContent);
        btnSubmitNote = findViewById(R.id.btnSubmitNote);
        progressSubmitNote = findViewById(R.id.progressSubmitNote);

        btnSubmitNote.setOnClickListener(v -> submitNote());
    }

    private void submitNote() {
        String content = editNoteContent.getText().toString().trim();
        if (content.isEmpty()) {
            Toast.makeText(this, "Please enter note content", Toast.LENGTH_SHORT).show();
            return;
        }

        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);
        String userId = prefs.getString("user_id", "");

        progressSubmitNote.setVisibility(View.VISIBLE);
        btnSubmitNote.setEnabled(false);

        try {
            JSONObject body = new JSONObject();
            body.put("patientId", patientId);
            body.put("userId", userId);
            body.put("content", content);

            ApiClient.post("/notes", body, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    runOnUiThread(() -> {
                        progressSubmitNote.setVisibility(View.GONE);
                        btnSubmitNote.setEnabled(true);
                        Toast.makeText(AddNoteActivity.this, "Note saved", Toast.LENGTH_SHORT).show();
                        setResult(RESULT_OK);
                        finish();
                    });
                }

                @Override
                public void onError(Exception error) {
                    runOnUiThread(() -> {
                        progressSubmitNote.setVisibility(View.GONE);
                        btnSubmitNote.setEnabled(true);
                        Toast.makeText(AddNoteActivity.this, "Failed to save: " + error.getMessage(), Toast.LENGTH_LONG)
                                .show();
                    });
                }
            });
        } catch (JSONException e) {
            progressSubmitNote.setVisibility(View.GONE);
            btnSubmitNote.setEnabled(true);
            Toast.makeText(this, "JSON Error", Toast.LENGTH_SHORT).show();
        }
    }
}
