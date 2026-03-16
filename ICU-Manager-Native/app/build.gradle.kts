plugins {
    id("com.android.application")
}

android {
    namespace = "com.icumanager.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.icumanager.app"
        minSdk = 24
        targetSdk = 34
        versionCode = 2
        versionName = "2.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
        viewBinding = true
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.recyclerview:recyclerview:1.3.2")
    implementation("androidx.cardview:cardview:1.0.0")
    implementation("androidx.viewpager2:viewpager2:1.0.0")
    implementation("androidx.drawerlayout:drawerlayout:1.2.0")
    // Charts
    implementation("com.github.PhilJay:MPAndroidChart:v3.1.0")
    // Image loading
    implementation("com.squareup.picasso:picasso:2.8")
    // OkHttp for SSE
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}
