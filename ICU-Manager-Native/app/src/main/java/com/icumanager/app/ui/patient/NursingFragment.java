package com.icumanager.app.ui.patient;

import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;
import java.io.File;
import java.io.FileInputStream;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class NursingFragment extends Fragment {

    private static final int PICK_IMAGE = 911;

    private String patientId;
    private RecyclerView recyclerView;
    private SkinAssessmentAdapter adapter;
    private ProgressBar progressBar;
    private TextView textEmpty;
    private Button btnAddAssessment;

    // Form state
    private Uri selectedImageUri = null;

    public static NursingFragment newInstance(String patientId) {
        NursingFragment fragment = new NursingFragment();
        Bundle args = new Bundle();
        args.putString("patient_id", patientId);
        fragment.setArguments(args);
        return fragment;
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getArguments() != null) {
            patientId = getArguments().getString("patient_id");
        }
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_nursing, container, false);

        recyclerView = view.findViewById(R.id.recyclerSkinAssessments);
        progressBar = view.findViewById(R.id.progressNursing);
        textEmpty = view.findViewById(R.id.textNursingEmpty);
        btnAddAssessment = view.findViewById(R.id.btnAddSkinAssessment);

        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new SkinAssessmentAdapter();
        recyclerView.setAdapter(adapter);

        btnAddAssessment.setOnClickListener(v -> showAddAssessmentDialog());

        loadAssessments();
        return view;
    }

    private void loadAssessments() {
        SharedPreferences prefs = requireActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        progressBar.setVisibility(View.VISIBLE);
        textEmpty.setVisibility(View.GONE);

        ApiClient.get("/skin/" + patientId, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                if (getActivity() == null)
                    return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    try {
                        JSONArray array;
                        if (responseStr.trim().startsWith("[")) {
                            array = new JSONArray(responseStr);
                        } else {
                            JSONObject obj = new JSONObject(responseStr);
                            array = obj.optJSONArray("data");
                            if (array == null)
                                array = new JSONArray();
                        }
                        adapter.setAssessments(array);
                        textEmpty.setVisibility(array.length() == 0 ? View.VISIBLE : View.GONE);
                    } catch (Exception e) {
                        textEmpty.setVisibility(View.VISIBLE);
                    }
                });
            }

            @Override
            public void onError(Exception error) {
                if (getActivity() == null)
                    return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    textEmpty.setVisibility(View.VISIBLE);
                    Toast.makeText(getContext(), "Failed to load assessments", Toast.LENGTH_SHORT).show();
                });
            }
        });
    }

    private void showAddAssessmentDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(requireContext());
        builder.setTitle("Add Skin Assessment");

        View dialogView = LayoutInflater.from(getContext()).inflate(R.layout.dialog_add_skin_assessment, null);
        builder.setView(dialogView);

        Spinner spinnerBodyPart = dialogView.findViewById(R.id.spinnerBodyPart);
        Spinner spinnerView = dialogView.findViewById(R.id.spinnerBodyView);
        Spinner spinnerType = dialogView.findViewById(R.id.spinnerAssessType);
        EditText editNotes = dialogView.findViewById(R.id.editAssessNotes);
        Button btnPickImg = dialogView.findViewById(R.id.btnPickAssessImage);
        TextView textImgStatus = dialogView.findViewById(R.id.textAssessImageStatus);
        ImageView imagePreview = dialogView.findViewById(R.id.imageAssessPreview);

        String[] bodyParts = { "Head", "Neck", "Chest", "Abdomen", "Left Arm", "Right Arm",
                "Left Leg", "Right Leg", "Back", "Sacrum", "Heel", "Other" };
        String[] views = { "FRONT", "BACK" };
        String[] types = { "LESION", "DRESSING" };

        spinnerBodyPart.setAdapter(new ArrayAdapter<>(requireContext(),
                android.R.layout.simple_spinner_dropdown_item, bodyParts));
        spinnerView.setAdapter(new ArrayAdapter<>(requireContext(),
                android.R.layout.simple_spinner_dropdown_item, views));
        spinnerType.setAdapter(new ArrayAdapter<>(requireContext(),
                android.R.layout.simple_spinner_dropdown_item, types));

        selectedImageUri = null;

        btnPickImg.setOnClickListener(v -> {
            Intent intent = new Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
            // Store reference for result — use a simple workaround
            currentDialogImageView = imagePreview;
            currentDialogTextStatus = textImgStatus;
            startActivityForResult(intent, PICK_IMAGE);
        });

        AlertDialog dialog = builder.create();

        dialogView.findViewById(R.id.btnSubmitAssessment).setOnClickListener(v -> {
            String bodyPart = spinnerBodyPart.getSelectedItem().toString();
            String bodyView = spinnerView.getSelectedItem().toString();
            String type = spinnerType.getSelectedItem().toString();
            String notes = editNotes.getText().toString().trim();

            submitAssessment(dialog, bodyPart, bodyView, type, notes);
        });

        dialogView.findViewById(R.id.btnCancelAssessment).setOnClickListener(v -> dialog.dismiss());

        dialog.show();
    }

    // Temp references for dialog image picker
    private ImageView currentDialogImageView;
    private TextView currentDialogTextStatus;

    @Override
    public void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PICK_IMAGE && resultCode == android.app.Activity.RESULT_OK && data != null) {
            selectedImageUri = data.getData();
            if (currentDialogImageView != null) {
                currentDialogImageView.setImageURI(selectedImageUri);
                currentDialogImageView.setVisibility(View.VISIBLE);
            }
            if (currentDialogTextStatus != null) {
                currentDialogTextStatus.setText("Image selected");
            }
        }
    }

    private void submitAssessment(AlertDialog dialog, String bodyPart, String bodyView,
            String type, String notes) {
        SharedPreferences prefs = requireActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);
        String userId = prefs.getString("user_id", "");

        if (selectedImageUri != null) {
            uploadImageThenSave(dialog, token, userId, bodyPart, bodyView, type, notes);
        } else {
            saveSkinAssessment(dialog, token, userId, bodyPart, bodyView, type, notes, null);
        }
    }

    private void uploadImageThenSave(AlertDialog dialog, String token, String userId,
            String bodyPart, String bodyView, String type, String notes) {
        try {
            String[] projection = { MediaStore.Images.Media.DATA };
            android.database.Cursor cursor = requireActivity().getContentResolver()
                    .query(selectedImageUri, projection, null, null, null);
            String filePath = null;
            if (cursor != null) {
                cursor.moveToFirst();
                int idx = cursor.getColumnIndex(MediaStore.Images.Media.DATA);
                if (idx >= 0)
                    filePath = cursor.getString(idx);
                cursor.close();
            }
            if (filePath == null) {
                saveSkinAssessment(dialog, token, userId, bodyPart, bodyView, type, notes, null);
                return;
            }
            File file = new File(filePath);
            byte[] fileBytes;
            try (FileInputStream fis = new FileInputStream(file)) {
                fileBytes = new byte[(int) file.length()];
                fis.read(fileBytes);
            }
            ApiClient.uploadFile("/upload", fileBytes, file.getName(), token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String responseStr) {
                    if (getActivity() == null)
                        return;
                    getActivity().runOnUiThread(() -> {
                        String imageUrl = null;
                        try {
                            if (responseStr.trim().startsWith("[")) {
                                JSONArray arr = new JSONArray(responseStr);
                                if (arr.length() > 0)
                                    imageUrl = arr.getJSONObject(0).optString("url");
                            } else {
                                imageUrl = new JSONObject(responseStr).optString("url");
                            }
                        } catch (Exception ignored) {
                        }
                        saveSkinAssessment(dialog, token, userId, bodyPart, bodyView, type, notes, imageUrl);
                    });
                }

                @Override
                public void onError(Exception error) {
                    if (getActivity() == null)
                        return;
                    getActivity().runOnUiThread(
                            () -> saveSkinAssessment(dialog, token, userId, bodyPart, bodyView, type, notes, null));
                }
            });
        } catch (Exception e) {
            saveSkinAssessment(dialog, token, userId, bodyPart, bodyView, type, notes, null);
        }
    }

    private void saveSkinAssessment(AlertDialog dialog, String token, String userId,
            String bodyPart, String bodyView, String type, String notes, String imageUrl) {
        try {
            JSONObject body = new JSONObject();
            body.put("patientId", patientId);
            body.put("authorId", userId);
            body.put("bodyPart", bodyPart);
            body.put("view", bodyView);
            body.put("type", type);
            body.put("notes", notes);
            if (imageUrl != null)
                body.put("imageUrl", imageUrl);

            ApiClient.post("/skin", body, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    if (getActivity() == null)
                        return;
                    getActivity().runOnUiThread(() -> {
                        Toast.makeText(getContext(), "Skin assessment saved", Toast.LENGTH_SHORT).show();
                        dialog.dismiss();
                        loadAssessments();
                    });
                }

                @Override
                public void onError(Exception error) {
                    if (getActivity() == null)
                        return;
                    getActivity().runOnUiThread(() -> Toast
                            .makeText(getContext(), "Failed: " + error.getMessage(), Toast.LENGTH_LONG).show());
                }
            });
        } catch (Exception e) {
            Toast.makeText(getContext(), "Error building request", Toast.LENGTH_SHORT).show();
        }
    }

    // Inner adapter for skin assessments
    static class SkinAssessmentAdapter extends RecyclerView.Adapter<SkinAssessmentAdapter.ViewHolder> {

        private JSONArray assessments = new JSONArray();

        void setAssessments(JSONArray assessments) {
            this.assessments = assessments;
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View view = LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_skin_assessment, parent, false);
            return new ViewHolder(view);
        }

        @Override
        public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
            // Newest first
            JSONObject a = assessments.optJSONObject(assessments.length() - 1 - position);
            if (a == null)
                return;

            String bodyPart = a.optString("bodyPart", "—");
            String view = a.optString("view", "");
            String type = a.optString("type", "—");
            String notes = a.optString("notes", "");
            String timestamp = a.optString("timestamp", a.optString("createdAt", ""));

            // Author info
            String authorName = "";
            JSONObject author = a.optJSONObject("author");
            if (author != null)
                authorName = author.optString("name", "");

            holder.textBodyPart.setText(bodyPart + (view.isEmpty() ? "" : " (" + view + ")"));
            holder.textType.setText(type);
            holder.textNotes.setText(notes.isEmpty() ? "No notes" : notes);
            holder.textAuthor.setText(authorName.isEmpty() ? "" : "By: " + authorName);
            holder.textTime.setText(formatTs(timestamp));

            // Color badge by type
            int color = "LESION".equals(type) ? 0xFFEF4444 : 0xFF10B981;
            holder.textType.setBackgroundColor(color);
            holder.textType.setTextColor(0xFFFFFFFF);
        }

        @Override
        public int getItemCount() {
            return assessments.length();
        }

        private String formatTs(String ts) {
            try {
                SimpleDateFormat input = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                input.setTimeZone(TimeZone.getTimeZone("UTC"));
                Date date = input.parse(ts);
                return new SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.US).format(date);
            } catch (Exception e) {
                return ts.length() >= 16 ? ts.substring(0, 16).replace("T", " ") : ts;
            }
        }

        static class ViewHolder extends RecyclerView.ViewHolder {
            TextView textBodyPart, textType, textNotes, textAuthor, textTime;

            ViewHolder(View v) {
                super(v);
                textBodyPart = v.findViewById(R.id.textAssessBodyPart);
                textType = v.findViewById(R.id.textAssessType);
                textNotes = v.findViewById(R.id.textAssessNotes);
                textAuthor = v.findViewById(R.id.textAssessAuthor);
                textTime = v.findViewById(R.id.textAssessTime);
            }
        }
    }
}
