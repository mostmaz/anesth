package com.icumanager.app.ui.patient;

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
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class AddVitalsActivity extends AppCompatActivity {

    private static final int PICK_IMAGE_REQUEST = 200;

    private String patientId;

    private EditText editTemp;
    private EditText editSys;
    private EditText editDia;
    private EditText editHR;
    private EditText editRR;
    private EditText editSpO2;
    private EditText editRBS;

    private Button btnSubmitVitals;
    private ProgressBar progressSubmit;

    private Button btnAttachVitalImage;
    private ImageView imageVitalPreview;
    private TextView textImageStatus;

    private byte[] selectedImageBytes = null;
    private String selectedImageName = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_add_vitals);

        patientId = getIntent().getStringExtra("patient_id");
        if (patientId == null) {
            Toast.makeText(this, "Missing patient ID", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        Toolbar toolbar = findViewById(R.id.toolbarAddVitals);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setDisplayShowHomeEnabled(true);
        }
        toolbar.setNavigationOnClickListener(v -> finish());

        editTemp  = findViewById(R.id.editTemp);
        editSys   = findViewById(R.id.editSys);
        editDia   = findViewById(R.id.editDia);
        editHR    = findViewById(R.id.editHR);
        editRR    = findViewById(R.id.editRR);
        editSpO2  = findViewById(R.id.editSpO2);
        editRBS   = findViewById(R.id.editRBS);

        btnSubmitVitals  = findViewById(R.id.btnSubmitVitals);
        progressSubmit   = findViewById(R.id.progressSubmit);

        btnAttachVitalImage = findViewById(R.id.btnAttachVitalImage);
        imageVitalPreview   = findViewById(R.id.imageVitalPreview);
        textImageStatus     = findViewById(R.id.textImageStatus);

        btnAttachVitalImage.setOnClickListener(v -> openGallery());
        btnSubmitVitals.setOnClickListener(v -> startSubmitFlow());
    }

    private void openGallery() {
        Intent intent = new Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
        intent.setType("image/*");
        startActivityForResult(intent, PICK_IMAGE_REQUEST);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PICK_IMAGE_REQUEST && resultCode == RESULT_OK
                && data != null && data.getData() != null) {
            processUri(data.getData());
        }
    }

    private void processUri(Uri uri) {
        try {
            InputStream inputStream = getContentResolver().openInputStream(uri);
            Bitmap bitmap = BitmapFactory.decodeStream(inputStream);
            imageVitalPreview.setImageBitmap(bitmap);
            imageVitalPreview.setVisibility(View.VISIBLE);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.JPEG, 80, baos);
            selectedImageBytes = baos.toByteArray();

            String path = uri.getPath();
            selectedImageName = "vital_" + System.currentTimeMillis() + ".jpg";
            if (path != null && path.contains("/")) {
                selectedImageName = path.substring(path.lastIndexOf("/") + 1) + ".jpg";
            }

            textImageStatus.setText("Image selected: " + selectedImageName);
            textImageStatus.setVisibility(View.VISIBLE);
            btnAttachVitalImage.setText("Change Image");
        } catch (Exception e) {
            Toast.makeText(this, "Failed to load image: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private void startSubmitFlow() {
        String temp  = editTemp.getText().toString().trim();
        String sys   = editSys.getText().toString().trim();
        String dia   = editDia.getText().toString().trim();
        String hr    = editHR.getText().toString().trim();
        String rr    = editRR.getText().toString().trim();
        String spo2  = editSpO2.getText().toString().trim();
        String rbs   = editRBS.getText().toString().trim();

        if (temp.isEmpty() && sys.isEmpty() && dia.isEmpty() && hr.isEmpty()
                && rr.isEmpty() && spo2.isEmpty() && rbs.isEmpty()) {
            Toast.makeText(this, "Please enter at least one vital sign", Toast.LENGTH_SHORT).show();
            return;
        }

        progressSubmit.setVisibility(View.VISIBLE);
        btnSubmitVitals.setEnabled(false);

        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);
        String userId = prefs.getString("user_id", "");

        if (selectedImageBytes != null) {
            // Upload image first, then submit vitals with imageUrl
            textImageStatus.setText("Uploading image…");
            java.util.List<byte[]> dataList = new java.util.ArrayList<>();
            dataList.add(selectedImageBytes);
            java.util.List<String> nameList = new java.util.ArrayList<>();
            nameList.add(selectedImageName);

            ApiClient.uploadFiles("/upload", dataList, nameList, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    String imageUrl = "";
                    try {
                        JSONArray arr = new JSONArray(response);
                        if (arr.length() > 0) {
                            imageUrl = arr.getJSONObject(0).optString("url", "");
                        }
                    } catch (JSONException ignored) {}
                    final String finalUrl = imageUrl;
                    runOnUiThread(() -> {
                        if (!finalUrl.isEmpty()) {
                            textImageStatus.setText("Image uploaded ✓");
                        }
                        submitVitals(token, userId, temp, sys, dia, hr, rr, spo2, rbs, finalUrl);
                    });
                }

                @Override
                public void onError(Exception error) {
                    runOnUiThread(() -> {
                        textImageStatus.setText("Image upload failed — saving vitals without image");
                        submitVitals(token, userId, temp, sys, dia, hr, rr, spo2, rbs, "");
                    });
                }
            });
        } else {
            submitVitals(token, userId, temp, sys, dia, hr, rr, spo2, rbs, "");
        }
    }

    private void submitVitals(String token, String userId,
            String temp, String sys, String dia, String hr,
            String rr, String spo2, String rbs, String imageUrl) {
        try {
            JSONObject body = new JSONObject();
            body.put("patientId", patientId);
            body.put("userId", userId);

            if (!temp.isEmpty())  body.put("temperature", Double.parseDouble(temp));
            if (!hr.isEmpty())    body.put("heartRate", Integer.parseInt(hr));
            if (!rr.isEmpty())    body.put("respiratoryRate", Integer.parseInt(rr));
            if (!spo2.isEmpty())  body.put("oxygenSaturation", Integer.parseInt(spo2));
            if (!rbs.isEmpty())   body.put("rbs", Double.parseDouble(rbs));
            if (!sys.isEmpty() && !dia.isEmpty()) {
                body.put("bloodPressure", sys + "/" + dia);
            }
            if (!imageUrl.isEmpty()) {
                body.put("imageUrl", imageUrl);
            }

            ApiClient.post("/vitals", body, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    runOnUiThread(() -> {
                        progressSubmit.setVisibility(View.GONE);
                        btnSubmitVitals.setEnabled(true);
                        Toast.makeText(AddVitalsActivity.this, "Vitals saved successfully",
                                Toast.LENGTH_SHORT).show();
                        setResult(RESULT_OK);
                        finish();
                    });
                }

                @Override
                public void onError(Exception error) {
                    runOnUiThread(() -> {
                        progressSubmit.setVisibility(View.GONE);
                        btnSubmitVitals.setEnabled(true);
                        Toast.makeText(AddVitalsActivity.this,
                                "Failed to save vitals: " + error.getMessage(),
                                Toast.LENGTH_LONG).show();
                    });
                }
            });
        } catch (JSONException | NumberFormatException e) {
            progressSubmit.setVisibility(View.GONE);
            btnSubmitVitals.setEnabled(true);
            Toast.makeText(this, "Invalid number format", Toast.LENGTH_SHORT).show();
        }
    }
}
