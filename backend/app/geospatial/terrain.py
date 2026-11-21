"""
Terrain Surface Generation for TERRAGUARD 3D Visualisation.

DISCLAIMER: This module generates a synthetic demonstration terrain surface
derived from spatial sine/cosine functions and noise.
It is NOT a real geological survey or digital elevation model.
Real terrain data would require DEM rasters from sources like OpenTopography or SRTM.
"""
import numpy as np

def generate_demo_terrain(
    lat_center: float = 23.75,
    lon_center: float = 86.40,
    grid_size: int = 40,
    span_deg: float = 0.4,
) -> dict:
    """
    Generate a synthetic terrain elevation grid for 3D Plotly visualisation.
    Centered by default around Jharia/Dhanbad mining zone (Jharkhand, India).
    
    Returns:
        dict with x (lon), y (lat), z (elevation_m) as 2D lists
    """
    lats = np.linspace(lat_center - span_deg / 2, lat_center + span_deg / 2, grid_size)
    lons = np.linspace(lon_center - span_deg / 2, lon_center + span_deg / 2, grid_size)
    lon_grid, lat_grid = np.meshgrid(lons, lats)
    
    # Synthetic elevation: undulating topography with mining pit simulation
    base_elev = 220.0
    hills = 65.0 * np.sin((lat_grid - lat_center) * 25.0) * np.cos((lon_grid - lon_center) * 20.0)
    ridges = 35.0 * np.cos((lat_grid - lat_center) * 45.0 + 0.8)
    # Simulated open-cast excavation trough near center
    dist_from_center = np.sqrt((lat_grid - lat_center) ** 2 + (lon_grid - lon_center) ** 2)
    trough = -45.0 * np.exp(- (dist_from_center / 0.08) ** 2)
    
    # Random micro-relief (deterministic seed)
    rng = np.random.default_rng(42)
    noise = rng.normal(0, 3.5, (grid_size, grid_size))
    
    z = base_elev + hills + ridges + trough + noise
    
    return {
        "x": lon_grid.tolist(),
        "y": lat_grid.tolist(),
        "z": np.round(z, 2).tolist(),
        "lat_center": lat_center,
        "lon_center": lon_center,
        "span_deg": span_deg,
        "grid_size": grid_size,
        "disclaimer": "SYNTHETIC DEMONSTRATION TERRAIN — NOT AN ACTUAL GEOLOGICAL SURVEY",
    }
