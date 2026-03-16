package com.icumanager.app.ui.patient;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;

public class AddConsultationActivity extends AppCompatActivity {

    private static final int PICK_IMAGE = 901;

    private String patientId;
    private EditText editDoctorName, editSpecialty, editNotes;
    private Button btnPickImage, btnSubmit;
    private ImageView imagePreview;
    private TextView textImageStatus;
    private ProgressBar progressBar;

    private Uri selectedImageUri = null;
    private String uploadedImageUrl = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_add_consultation);

        patientId = getIntent().getStringExtra("patient_id");
        if (patientId == null) {
            Toast.makeText(this, "Missing patient ID", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        Toolbar toolbar = findViewById(R.id.toolbarConsultation);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setTitle("Add Consultation");
        }
        toolbar.setNavigationOnClickListener(v -> finish());

        editDoctorName = findViewById(R.id.editConsultDoctorName);
        editSpecialty = findViewById(R.id.editConsultSpecialty);
        editNotes = findViewById(R.id.editConsultNotes);
        btnPickImage = findViewById(R.id.btnPickConsultImage);
        btnSubmit = findViewById(R.id.btnSubmitConsultation);
        imagePreview = findViewById(R.id.imageConsultPreview);
        textImageStatus = findViewById(R.id.textConsultImageStatus);
        progressBar = findViewById(R.id.progressConsultationForm);

        btnPickImage.setOnClickListener(v -> {
            Intent intent = new Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
            startActivityForResult(intent, PICK_IMAGE);
        });

        btnSubmit.setOnClickListener(v -> submitConsultation());
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PICK_IMAGE && resultCode == RESULT_OK && data != null) {
            selectedImageUri = data.getData();
            imagePreview.setImageURI(selectedImageUri);
            imagePreview.setVisibility(View.VISIBLE);
            textImageStatus.setText("Image selected — will upload on submit");
        }
    }

    private void submitConsultation() {
        String doctorName = editDoctorName.getText().toString().trim();
        String specialty = editSpecialty.getText().toString().trim();
        String notes = editNotes.getText().toString().trim();

        if (doctorName.isEmpty() || specialty.isEmpty()) {
            Toast.makeText(this, "Doctor name and specialty are required", Toast.LENGTH_SHORT).show();
            return;
        }

        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);
        String userId = prefs.getString("user_id", "");

        progressBar.setVisibility(View.VISIBLE);
        btnSubmit.setEnabled(false);

        if (selectedImageUri != null) {
            // Upload image first, then save consultation
            uploadImageAndSave(selectedImageUri, token, userId, doctorName, specialty, notes);
        } else {
            saveConsultation(token, userId, doctorName, specialty, notes, null);
        }
    }

    private void uploadImageAndSave(Uri uri, String token, String userId,
            String doctorName, String specialty, String notes) {
        try {
            String[] projection = { MediaStore.Images.Media.DATA };
            android.database.Cursor cursor = getContentResolver().query(uri, projection, null, null, null);
            String filePath = null;
            if (cursor != null) {
                cursor.moveToFirst();
                int colIdx = cursor.getColumnIndex(MediaStore.Images.Media.DATA);
                if (colIdx >= 0) filePath = cursor.getString(colIdx);
                cursor.close();
            }

            if (filePath == null) {
                Toast.makeText(this, "Could not read image file", Toast.LENGTH_SHORT).show();
                progressBar.setVisibility(View.GONE);
                btnSubmit.setEnabled(true);
                return;
            }

            File imageFile = new File(filePath);
            byte[] imageBytes;
            try (FileInputStream fis = new FileInputStream(imageFile)) {
                imageBytes = new byte[(int) imageFile.length()];
                fis.read(imageBytes);
            }
            ApiClient.uploadFile("/upload", imageBytes, imageFile.getName(), token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String responseStr) {
                    runOnUiThread(() -> {
                        try {
                            JSONObject resp = new JSONObject(responseStr);
                            String imageUrl = resp.optString("url", "");
                            if (imageUrl.isEmpty()) {
                                // Try array response
                                JSONArray arr = new JSONArray(responseStr);
                                imageUrl = arr.optJSONObject(0) != null
                                        ? arr.optJSONObject(0).optString("url", "") : "";
                            }
                            saveConsultation(token, userId, doctorName, specialty, notes, imageUrl);
                        } catch (Exception e) {
                            saveConsultation(token, userId, doctorName, specialty, notes, null);
                        }
                    });
                }

                @Override
                public void onError(Exception error) {
                    runOnUiThread(() -> {
                        // Proceed without image on upload failure
                        Toast.makeText(AddConsultationActivity.this, "Image upload failed, saving without image",
                                Toast.LENGTH_SHORT).show();
                        saveConsultation(token, userId, doctorName, specialty, notes, null);
                    });
                }
            });
        } catch (Exception e) {
            saveConsultation(token, userId, doctorName, specialty, notes, null);
        }
    }

    private void saveConsultation(String token, String userId, String doctorName,
            String specialty, String notes, String imageUrl) {
        try {
            JSONObject body = new JSONObject();
            body.put("patientId", patientId);
            body.put("authorId", userId);
            body.put("doctorName", doctorName);
            body.put("specialty", specialty);
            body.put("notes", notes);
            if (imageUrl != null && !imageUrl.isEmpty()) {
                body.put("imageUrl", imageUrl);
            }

            ApiClient.post("/patients/" + patientId + "/consultations", body, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        Toast.makeText(AddConsultationActivity.this, "Consultation saved", Toast.LENGTH_SHORT).show();
                        setResult(RESULT_OK);
                        finish();
                    });
                }

                @Override
                public void onError(Exception error) {
                    runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        btnSubmit.setEnabled(true);
                        Toast.makeText(AddConsultationActivity.this,
                                "Failed to save: " + error.getMessage(), Toast.LENGTH_LONG).show();
                    });
                }
            });
        } catch (Exception e) {
            progressBar.setVisibility(View.GONE);
            btnSubmit.setEnabled(true);
            Toast.makeText(this, "Error building request", Toast.LENGTH_SHORT).show();
        }
    }
}
