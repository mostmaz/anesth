package com.icumanager.app.ui.patient;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.icumanager.app.R;
import com.icumanager.app.models.VentilatorSetting;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class VentilatorAdapter extends RecyclerView.Adapter<VentilatorAdapter.VentilatorViewHolder> {

    private List<VentilatorSetting> settings;
    private SimpleDateFormat inputFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
    private SimpleDateFormat outputFormat = new SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.US);

    public VentilatorAdapter(List<VentilatorSetting> settings) {
        this.settings = settings;
    }

    @NonNull
    @Override
    public VentilatorViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_ventilator, parent, false);
        return new VentilatorViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull VentilatorViewHolder holder, int position) {
        VentilatorSetting setting = settings.get(position);

        try {
            if (setting.getTimestamp() != null) {
                Date date = inputFormat.parse(setting.getTimestamp());
                holder.textVentTime.setText(outputFormat.format(date));
            } else {
                holder.textVentTime.setText("N/A");
            }
        } catch (ParseException e) {
            holder.textVentTime.setText(setting.getTimestamp());
        }

        holder.textVentModeRate.setText(setting.getMode() + " / " + setting.getRate() + " bpm");
        holder.textVentFio2.setText("FiO2: " + setting.getFio2() + "%");
        holder.textVentVtPs.setText("VT/PS: " + setting.getVt() + "/" + setting.getPs());
        holder.textVentIe.setText("I:E: " + setting.getIe());
    }

    @Override
    public int getItemCount() {
        return settings != null ? settings.size() : 0;
    }

    public void updateData(List<VentilatorSetting> newSettings) {
        this.settings = newSettings;
        notifyDataSetChanged();
    }

    static class VentilatorViewHolder extends RecyclerView.ViewHolder {
        TextView textVentTime;
        TextView textVentModeRate;
        TextView textVentFio2;
        TextView textVentVtPs;
        TextView textVentIe;

        public VentilatorViewHolder(@NonNull View itemView) {
            super(itemView);
            textVentTime = itemView.findViewById(R.id.textVentTime);
            textVentModeRate = itemView.findViewById(R.id.textVentModeRate);
            textVentFio2 = itemView.findViewById(R.id.textVentFio2);
            textVentVtPs = itemView.findViewById(R.id.textVentVtPs);
            textVentIe = itemView.findViewById(R.id.textVentIe);
        }
    }
}
