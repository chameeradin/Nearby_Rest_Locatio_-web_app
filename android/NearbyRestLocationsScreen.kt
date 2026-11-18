package com.wavesit.nearbyrestlocations.ui

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.location.Location
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Hotel
import androidx.compose.material.icons.filled.LocalCafe
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Villa
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SearchBar
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority

enum class PlaceCategory(val label: String, val placeType: String) {
    HOTELS("Hotels", "lodging"),
    RESTAURANTS("Restaurants", "restaurant"),
    CABANAS("Cabanas", "resort_hotel"),
    CAFES("Cafes", "cafe")
}

data class NearbyPlaceUiModel(
    val placeId: String,
    val name: String,
    val category: PlaceCategory,
    val address: String,
    val phoneNumber: String?,
    val rating: Double?,
    val userRatingCount: Int?
)

/**
 * Nearby Rest Locations — Android Jetpack Compose Companion Screen
 * Developed by Waves IT
 * Uses Google Play Services Location (FusedLocationProviderClient) + Material 3 SearchBar & FilterChips.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NearbyRestLocationsScreen(
    places: List<NearbyPlaceUiModel>,
    onSearchNearby: (lat: Double, lng: Double, category: PlaceCategory?, query: String) -> Unit,
    onSelectPlace: (NearbyPlaceUiModel) -> Unit
) {
    val context = LocalContext.current
    val fusedLocationClient = remember { LocationServices.getFusedLocationProviderClient(context) }

    var searchQuery by remember { mutableStateOf("") }
    var searchActive by remember { mutableStateOf(false) }
    var selectedCategory by remember { mutableStateOf<PlaceCategory?>(PlaceCategory.HOTELS) }
    var currentLocation by remember { mutableStateOf<Location?>(null) }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) {
            fetchCurrentLocation(fusedLocationClient) { loc ->
                currentLocation = loc
                if (loc != null) {
                    onSearchNearby(loc.latitude, loc.longitude, selectedCategory, searchQuery)
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        val hasFine = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (hasFine) {
            fetchCurrentLocation(fusedLocationClient) { loc ->
                currentLocation = loc
                if (loc != null) {
                    onSearchNearby(loc.latitude, loc.longitude, selectedCategory, searchQuery)
                }
            }
        } else {
            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Nearby Rest Locations", fontWeight = FontWeight.SemiBold)
                        Text(
                            text = currentLocation?.let {
                                "GPS: %.4f, %.4f".format(it.latitude, it.longitude)
                            } ?: "Acquiring GPS location...",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            SearchBar(
                query = searchQuery,
                onQueryChange = { searchQuery = it },
                onSearch = { query ->
                    searchActive = false
                    currentLocation?.let { loc ->
                        onSearchNearby(loc.latitude, loc.longitude, selectedCategory, query)
                    }
                },
                active = searchActive,
                onActiveChange = { searchActive = it },
                placeholder = { Text("Search hotels, restaurants, cabanas, cafes...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search") },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Close, contentDescription = "Clear search")
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {}

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                PlaceCategory.entries.forEach { category ->
                    val icon = when (category) {
                        PlaceCategory.HOTELS -> Icons.Default.Hotel
                        PlaceCategory.RESTAURANTS -> Icons.Default.Restaurant
                        PlaceCategory.CABANAS -> Icons.Default.Villa
                        PlaceCategory.CAFES -> Icons.Default.LocalCafe
                    }
                    FilterChip(
                        selected = selectedCategory == category,
                        onClick = {
                            selectedCategory = if (selectedCategory == category) null else category
                            currentLocation?.let { loc ->
                                onSearchNearby(loc.latitude, loc.longitude, selectedCategory, searchQuery)
                            }
                        },
                        label = { Text(category.label) },
                        leadingIcon = { Icon(icon, contentDescription = null) }
                    )
                }
            }

            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                val filtered = places.filter { place ->
                    (selectedCategory == null || place.category == selectedCategory) &&
                        (searchQuery.isBlank() || place.name.contains(searchQuery, ignoreCase = true))
                }
                items(filtered, key = { it.placeId }) { item ->
                    Card(
                        onClick = { onSelectPlace(item) },
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = item.name,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Default.LocationOn,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = item.address,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            if (item.rating != null) {
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = "${item.rating} ★ (${item.userRatingCount ?: 0} Google reviews) · ${item.category.label}",
                                    style = MaterialTheme.typography.labelMedium
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@SuppressLint("MissingPermission")
private fun fetchCurrentLocation(
    client: com.google.android.gms.location.FusedLocationProviderClient,
    onResult: (Location?) -> Unit
) {
    client.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null)
        .addOnSuccessListener { location -> onResult(location) }
        .addOnFailureListener { onResult(null) }
}
