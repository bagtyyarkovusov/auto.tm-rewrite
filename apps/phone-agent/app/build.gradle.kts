plugins {
  id("com.android.application")
  kotlin("android")
}

android {
  namespace = "tm.auto.phoneagent"
  compileSdk = 35

  defaultConfig {
    applicationId = "tm.auto.phoneagent"
    minSdk = 26
    targetSdk = 35
    versionCode = 1
    versionName = "0.1.0"
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }

  kotlinOptions {
    jvmTarget = "17"
  }

  buildTypes {
    release {
      isMinifyEnabled = true
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
    }
  }
}

dependencies {
  implementation("androidx.core:core-ktx:1.15.0")
  implementation("androidx.appcompat:appcompat:1.7.0")
  implementation("io.ktor:ktor-client-core:3.0.2")
  implementation("io.ktor:ktor-client-okhttp:3.0.2")
  implementation("io.ktor:ktor-client-content-negotiation:3.0.2")
  implementation("io.ktor:ktor-serialization-kotlinx-json:3.0.2")
  implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
}
