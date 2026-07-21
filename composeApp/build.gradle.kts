plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "com.graphite.app"
    compileSdk = 35
    defaultConfig {
        minSdk = 24
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    jvm()

    androidTarget()

    iosX64 {
        binaries.framework {
            baseName = "GraphiteCompose"
        }
    }
    iosArm64 {
        binaries.framework {
            baseName = "GraphiteCompose"
        }
    }
    iosSimulatorArm64 {
        binaries.framework {
            baseName = "GraphiteCompose"
        }
    }

    sourceSets {
        commonMain.dependencies {
            implementation(libs.kotlinx.coroutines.core)
            implementation(libs.supabase.postgrest.kt)
            implementation(libs.supabase.auth.kt)
            implementation(libs.kotlinx.serialization.json)
        }

        androidMain.dependencies {
        }

        jvmMain.dependencies {
            implementation(libs.sqlite.jdbc)
            implementation(libs.ktor.client.cio)
        }

        iosMain.dependencies {
            implementation(libs.ktor.client.darwin)
        }

        jvmTest.dependencies {
            implementation(kotlin("test"))
        }
    }
}
