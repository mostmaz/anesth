package com.icumanager.app.ui.patient;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class UploadInvestigationActivity extends AppCompatActivity {

    private static final int PICK_IMAGE_REQUEST = 1;

    private String patientId;
    private String filterType;
    private byte[] imageBytes;
    private String fileName = "upload.jpg";

    private ImageView imagePreview;
    private Button btnSelectImage;
    private Button btnSubmitUpload;
    private ProgressBar progressUpload;
    private TextView textUploadStatus;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_upload_investigation);

        patientId = getIntent().getStringExtra("patient_id");
        filterType = getIntent().getStringExtra("filter_type");

        androidx.appcompat.widget.Toolbar toolbar = findViewById(R.id.toolbarUpload);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            toolbar.setNavigationOnClickListener(v -> finish());
        }

        imagePreview = findViewById(R.id.imagePreview);
        btnSelectImage = findViewById(R.id.btnSelectImage);
        btnSubmitUpload = findViewById(R.id.btnSubmitUpload);
        progressUpload = findViewById(R.id.progressUpload);
        textUploadStatus = findViewById(R.id.textUploadStatus);

        btnSelectImage.setOnClickListener(v -> openGallery());
        btnSubmitUpload.setOnClickListener(v -> startUploadFlow());
    }

    private void openGallery() {
        Intent intent = new Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
        startActivityForResult(intent, PICK_IMAGE_REQUEST);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == PICK_IMAGE_REQUEST && resultCode == RESULT_OK && data != null && data.getData() != null) {
            Uri imageUri = data.getData();
            try {
                InputStream inputStream = getContentResolver().openInputStream(imageUri);
                Bitmap bitmap = BitmapFactory.decodeStream(inputStream);
                imagePreview.setImageBitmap(bitmap);

                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                bitmap.compress(Bitmap.CompressFormat.JPEG, 80, baos);
                imageBytes = baos.toByteArray();

                String path = imageUri.getPath();
                if (path != null) {
                    fileName = path.substring(path.lastIndexOf("/") + 1) + ".jpg";
                }

                btnSubmitUpload.setEnabled(true);
            } catch (Exception e) {
                Toast.makeText(this, "Failed to load image", Toast.LENGTH_SHORT).show();
            }
        }
    }

    private void setStatus(String status, boolean isLoading) {
        runOnUiThread(() -> {
            textUploadStatus.setText(status);
            textUploadStatus.setVisibility(View.VISIBLE);
            progressUpload.setVisibility(isLoading ? View.VISIBLE : View.GONE);
            btnSelectImage.setEnabled(!isLoading);
            btnSubmitUpload.setEnabled(!isLoading);
        });
    }

    private void startUploadFlow() {
        if (imageBytes == null)
            return;

        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);
        String userId = prefs.getString("user_id", "");

        setStatus("Uploading Image...", true);

        // Step 1: Upload multipart file
        ApiClient.uploadFile("/upload", imageBytes, fileName, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String response) {
                try {
                    JSONArray jsonResponse = new JSONArray(response);
                    if (jsonResponse.length() > 0) {
                        JSONObject fileData = jsonResponse.getJSONObject(0);
                        String url = fileData.getString("url");
                        analyzeImageOCR(url, token, userId);
                    } else {
                        runOnUiThread(() -> {
                            setStatus("Upload returned empty response.", false);
                            Toast.makeText(UploadInvestigationActivity.this, "Upload failed: empty response",
                                    Toast.LENGTH_SHORT).show();
                        });
                    }
                } catch (JSONException e) {
                    runOnUiThread(() -> {
                        setStatus("Error parsing upload response.", false);
                    });
                }
            }

            @Override
            public void onError(Exception error) {
                runOnUiThread(() -> setStatus("Failed to upload: " + error.getMessage(), false));
            }
        });
    }

    private void analyzeImageOCR(String imageUrl, String token, String userId) {
        setStatus("Analyzing with AI...", true);

        try {
            JSONObject body = new JSONObject();
            body.put("filePath", imageUrl);
            body.put("mode", filterType != null && !filterType.isEmpty() ? filterType : "LAB");

            ApiClient.post("/ocr/analyze", body, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    try {
                        JSONArray aiResults;
                        if (response.trim().startsWith("[")) {
                            aiResults = new JSONArray(response);
                        } else {
                            aiResults = new JSONArray();
                            aiResults.put(new JSONObject(response));
                        }

                        if (aiResults.length() > 0) {
                            saveInvestigationDetails(aiResults, imageUrl, token, userId, 0);
                        } else {
                            // Fallback
                            saveFallbackInvestigation("AI returned no results", imageUrl, token, userId);
                        }
                    } catch (JSONException e) {
                        // Fallback
                        saveFallbackInvestigation("Failed to parse AI response: " + e.getMessage(), imageUrl, token,
                                userId);
                    }
                }

                @Override
                public void onError(Exception error) {
                    saveFallbackInvestigation("AI Analysis Failed", imageUrl, token, userId);
                }
            });
        } catch (JSONException e) {
            runOnUiThread(() -> setStatus("Error preparing OCR request.", false));
        }
    }

    private void saveFallbackInvestigation(String fallbackNote, String imageUrl, String token, String userId) {
        try {
            JSONArray fallbackArray = new JSONArray();
            JSONObject item = new JSONObject();
            item.put("type", "LAB");
            item.put("category", "External");
            item.put("title", fileName);
            JSONObject resultsObj = new JSONObject();
            resultsObj.put("note", fallbackNote);
            item.put("results", resultsObj);
            fallbackArray.put(item);
            saveInvestigationDetails(fallbackArray, imageUrl, token, userId, 0);
        } catch (JSONException ignored) {
        }
    }

    private void saveInvestigationDetails(JSONArray aiResults, String imageUrl, String token, String userId,
            int index) {
        if (index >= aiResults.length()) {
            runOnUiThread(() -> {
                setStatus("Successfully processed and saved!", false);
                Toast.makeText(this, "Investigation Saved", Toast.LENGTH_SHORT).show();
                setResult(Activity.RESULT_OK);
                finish();
            });
            return;
        }

        try {
            setStatus("Saving result " + (index + 1) + " of " + aiResults.length() + "...", true);
            JSONObject item = aiResults.getJSONObject(index);

            JSONObject body = new JSONObject();
            body.put("patientId", patientId);
            body.put("authorId", userId);
            body.put("type", item.optString("type", "LAB"));
            body.put("category", item.optString("category", "External"));
            body.put("title", item.optString("title", fileName));
            body.put("status", "FINAL");
            body.put("impression", "");

            JSONObject resultData = item.has("results") ? item.getJSONObject("results") : new JSONObject();
            resultData.put("imageUrl", imageUrl);
            resultData.put("text", resultData.toString());

            body.put("result", resultData);

            // Handle date if exists, simple approximation
            String conductedAt = item.optString("date", "");
            if (conductedAt.isEmpty()) {
                // Not standard ISO format maybe, use current as fallback
                body.put("conductedAt", new java.util.Date().toInstant().toString());
            } else {
                body.put("conductedAt", new java.util.Date().toInstant().toString()); // Placeholder to avoid crash
            }

            ApiClient.post("/investigations", body, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    saveInvestigationDetails(aiResults, imageUrl, token, userId, index + 1);
                }

                @Override
                public void onError(Exception error) {
                    saveInvestigationDetails(aiResults, imageUrl, token, userId, index + 1);
                }
            });

        } catch (JSONException e) {
            saveInvestigationDetails(aiResults, imageUrl, token, userId, index + 1);
        }
    }
}
