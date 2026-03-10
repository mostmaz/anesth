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
    private java.util.List<byte[]> imageBytesList = new java.util.ArrayList<>();
    private java.util.List<String> fileNames = new java.util.ArrayList<>();

    private ImageView imagePreview;
    private TextView textSelectedCount;
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
        textSelectedCount = findViewById(R.id.textSelectedCount);
        btnSelectImage = findViewById(R.id.btnSelectImage);
        btnSubmitUpload = findViewById(R.id.btnSubmitUpload);
        progressUpload = findViewById(R.id.progressUpload);
        textUploadStatus = findViewById(R.id.textUploadStatus);

        btnSelectImage.setOnClickListener(v -> openGallery());
        btnSubmitUpload.setOnClickListener(v -> startUploadFlow());
    }

    private void openGallery() {
        Intent intent = new Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        startActivityForResult(intent, PICK_IMAGE_REQUEST);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == PICK_IMAGE_REQUEST && resultCode == RESULT_OK && data != null) {
            imageBytesList.clear();
            fileNames.clear();

            if (data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                if (count > 3)
                    count = 3; // Limit to 3

                for (int i = 0; i < count; i++) {
                    processUri(data.getClipData().getItemAt(i).getUri());
                }
            } else if (data.getData() != null) {
                processUri(data.getData());
            }

            if (!imageBytesList.isEmpty()) {
                textSelectedCount.setText(imageBytesList.size() + " images selected");
                textSelectedCount.setVisibility(View.VISIBLE);
                btnSubmitUpload.setEnabled(true);
            }
        }
    }

    private void processUri(Uri imageUri) {
        try {
            InputStream inputStream = getContentResolver().openInputStream(imageUri);
            Bitmap bitmap = BitmapFactory.decodeStream(inputStream);
            if (imageBytesList.isEmpty()) {
                imagePreview.setImageBitmap(bitmap); // Preview only the first one
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.JPEG, 80, baos);
            imageBytesList.add(baos.toByteArray());

            String path = imageUri.getPath();
            String name = "upload_" + System.currentTimeMillis() + ".jpg";
            if (path != null && path.contains("/")) {
                name = path.substring(path.lastIndexOf("/") + 1) + ".jpg";
            }
            fileNames.add(name);

        } catch (Exception e) {
            Toast.makeText(this, "Failed to load image", Toast.LENGTH_SHORT).show();
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
        if (imageBytesList.isEmpty())
            return;

        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);
        String userId = prefs.getString("user_id", "");

        setStatus("Uploading " + imageBytesList.size() + " Images...", true);

        // Step 1: Upload multipart files (Batch)
        ApiClient.uploadFiles("/upload", imageBytesList, fileNames, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String response) {
                try {
                    JSONArray jsonResponse = new JSONArray(response);
                    if (jsonResponse.length() > 0) {
                        processUploadedFiles(jsonResponse, token, userId, 0);
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

    private void processUploadedFiles(JSONArray uploadedFiles, String token, String userId, int index) {
        if (index >= uploadedFiles.length()) {
            runOnUiThread(() -> {
                setStatus("Successfully processed all files!", false);
                Toast.makeText(this, "All Investigations Saved", Toast.LENGTH_SHORT).show();
                setResult(Activity.RESULT_OK);
                finish();
            });
            return;
        }

        try {
            JSONObject fileData = uploadedFiles.getJSONObject(index);
            String url = fileData.getString("url");
            String originalName = fileData.optString("originalName", "File " + (index + 1));
            analyzeImageOCR(uploadedFiles, index, url, originalName, token, userId);
        } catch (JSONException e) {
            processUploadedFiles(uploadedFiles, token, userId, index + 1);
        }
    }

    private void analyzeImageOCR(JSONArray uploadedFiles, int fileIndex, String imageUrl, String originalName,
            String token, String userId) {
        setStatus("Analyzing (" + (fileIndex + 1) + "/" + uploadedFiles.length() + "): " + originalName + "...", true);

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
                            saveInvestigationDetails(uploadedFiles, fileIndex, aiResults, imageUrl, originalName, token,
                                    userId, 0);
                        } else {
                            saveFallbackInvestigation(uploadedFiles, fileIndex, "AI returned no results", imageUrl,
                                    originalName, token, userId);
                        }
                    } catch (JSONException e) {
                        saveFallbackInvestigation(uploadedFiles, fileIndex, "Failed to parse AI response", imageUrl,
                                originalName, token, userId);
                    }
                }

                @Override
                public void onError(Exception error) {
                    saveFallbackInvestigation(uploadedFiles, fileIndex, "AI Analysis Failed", imageUrl, originalName,
                            token, userId);
                }
            });
        } catch (JSONException e) {
            processUploadedFiles(uploadedFiles, token, userId, fileIndex + 1);
        }
    }

    private void saveFallbackInvestigation(JSONArray uploadedFiles, int fileIndex, String fallbackNote,
            String imageUrl, String originalName, String token, String userId) {
        try {
            JSONArray fallbackArray = new JSONArray();
            JSONObject item = new JSONObject();
            item.put("type", "LAB");
            item.put("category", "External");
            item.put("title", originalName);
            JSONObject resultsObj = new JSONObject();
            resultsObj.put("note", fallbackNote);
            item.put("results", resultsObj);
            fallbackArray.put(item);
            saveInvestigationDetails(uploadedFiles, fileIndex, fallbackArray, imageUrl, originalName, token, userId, 0);
        } catch (JSONException ignored) {
            processUploadedFiles(uploadedFiles, token, userId, fileIndex + 1);
        }
    }

    private void saveInvestigationDetails(JSONArray uploadedFiles, int fileIndex, JSONArray aiResults, String imageUrl,
            String originalName, String token, String userId, int index) {
        if (index >= aiResults.length()) {
            // Finished this file, move to next
            processUploadedFiles(uploadedFiles, token, userId, fileIndex + 1);
            return;
        }

        try {
            setStatus("Saving result " + (index + 1) + "/" + aiResults.length() + " from " + originalName + "...",
                    true);
            JSONObject item = aiResults.getJSONObject(index);

            JSONObject body = new JSONObject();
            body.put("patientId", patientId);
            body.put("authorId", userId);
            body.put("type", item.optString("type", "LAB"));
            body.put("category", item.optString("category", "External"));
            body.put("title", item.optString("title", originalName));
            body.put("status", "FINAL");
            body.put("impression", "");

            JSONObject resultData = item.has("results") ? item.getJSONObject("results") : new JSONObject();
            resultData.put("imageUrl", imageUrl);
            resultData.put("text", resultData.toString());

            body.put("result", resultData);
            body.put("conductedAt", new java.util.Date().toInstant().toString());

            ApiClient.post("/investigations", body, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    saveInvestigationDetails(uploadedFiles, fileIndex, aiResults, imageUrl, originalName, token, userId,
                            index + 1);
                }

                @Override
                public void onError(Exception error) {
                    saveInvestigationDetails(uploadedFiles, fileIndex, aiResults, imageUrl, originalName, token, userId,
                            index + 1);
                }
            });

        } catch (JSONException e) {
            saveInvestigationDetails(uploadedFiles, fileIndex, aiResults, imageUrl, originalName, token, userId,
                    index + 1);
        }
    }
}
