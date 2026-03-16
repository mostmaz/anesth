package com.icumanager.app.ui.admin;

import android.os.Bundle;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;
import androidx.viewpager2.adapter.FragmentStateAdapter;
import androidx.viewpager2.widget.ViewPager2;
import com.google.android.material.tabs.TabLayout;
import com.google.android.material.tabs.TabLayoutMediator;
import com.icumanager.app.R;

public class AdminDashboardActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin_dashboard);

        findViewById(R.id.toolbarAdmin).setOnClickListener(v -> finish());

        TabLayout tabLayout = findViewById(R.id.tabLayoutAdmin);
        ViewPager2 viewPager = findViewById(R.id.viewPagerAdmin);

        viewPager.setAdapter(new FragmentStateAdapter(this) {
            @NonNull
            @Override
            public Fragment createFragment(int position) {
                switch (position) {
                    case 0:
                        return new UserManagementFragment();
                    case 1:
                        return new DrugCatalogFragment();
                    case 2:
                        return new NurseAssignmentFragment();
                    default:
                        return new UserManagementFragment();
                }
            }

            @Override
            public int getItemCount() {
                return 3;
            }
        });

        new TabLayoutMediator(tabLayout, viewPager, (tab, position) -> {
            switch (position) {
                case 0:
                    tab.setText("Users");
                    break;
                case 1:
                    tab.setText("Drug Catalog");
                    break;
                case 2:
                    tab.setText("Assignments");
                    break;
            }
        }).attach();
    }
}
