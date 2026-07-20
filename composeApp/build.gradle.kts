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

    targets.withType<org.jetbrains.kotlin.gradle.plugin.mpp.KotlinNativeTarget>().configureEach {
        compilations.getByName("main") {
            cinterops.create("sqlite3") {
                // Looks for src/nativeInterop/cinterop/sqlite3.def
            }
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
    }
}
