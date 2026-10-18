# SINNVO reference notes

> **Status: waiting on references.** The SINNVO photos, brochures and logo
> (`~/Desktop/sinvoo` on the Mac) haven't been uploaded to the build machine yet.
> The sections below are left open until they arrive; the geometry so far uses
> the draft model plus realistic villa-lift values, listed under
> **Assumptions**. Nothing in the ad shows a spec (capacity, speed,
> certification) that isn't from the brochures.

## From the references (to fill in)

| Topic | Seen in references | Source image / page |
|---|---|---|
| Models / variants | | |
| Shaft type (glass / steel / frameless) | | |
| Frame profile shape and colour | | |
| Door type (swing / telescopic / centre-opening) | | |
| Cabin walls | | |
| Ceiling light pattern | | |
| Cabin floor | | |
| Handrail | | |
| Control panel (COP) | | |
| Landing call buttons | | |
| Logo placement | | |
| Dimensions / capacity / speed printed | | |

**Model chosen for the ad:** _pending references_

## Assumptions in the current geometry

Each of these is a realistic villa-lift default, used only until the
references say otherwise. Values live in `scripts/config.py` and
`scripts/lift.py`.

| Item | Value used | Why |
|---|---|---|
| Storeys / storey height | 2 floors, 3.10 m | from the draft model |
| Shaft outside size | 1500 × 1700 mm | fits a 1000 × 1200 cabin plus rails and car frame behind it |
| Pit | 150 mm recess in the floor | common shallow pit for villa lifts |
| Overhead | 2.75 m from top landing to head-unit underside, head unit 360 mm | typical for a 2.15 m cabin |
| Corner posts | 80 × 80 mm extrusion, 4 mm corner radius, 3 × 2 mm shadow-gap groove on each face | typical glass-shaft profile |
| Frame bands | 80 mm at base and top, 240 mm band hiding the slab line at 2F | typical; hides the slab junction |
| Glass | 10 mm laminated, 0.8 mm bevelled edges, black EPDM gasket on both faces where it meets the frame | brief |
| Landing / cabin doors | telescopic centre-opening, 2 glass panels per side in 20 mm aluminium frames, 3 mm gaps, 800 × 2100 mm clear opening | draft + brief |
| Door open time | 2.5 s | brief |
| Thresholds | aluminium sill with one guide groove per door panel, flush with the floor | typical |
| Cabin | 1000 × 1200 mm inside, 2150 mm high | brief |
| Cabin walls | walnut back wall with steel kick plate; glass side walls on a 100 mm aluminium kick rail | draft |
| Ceiling | LED diffuser 800 × 960 mm with 12 mm steel trim, 3200 K | brief |
| Handrail | 32 mm round steel tube on the back wall, two wall brackets with rosettes | typical |
| Control panel | black-glass strip on the inside of the right front return: floor display, 2F, 1F, door open, door close, alarm | typical; button set to check against references |
| Landing call | brushed-steel plate on the front-right post, one round button with a ring bezel and an up/down arrow | typical |
| Guide rails | two T-rails at the back, brackets every 1.2 m | typical cantilever layout |
| Ride speed | 0.35 m/s, gentle acceleration | brief (0.3–0.4 m/s); not shown on screen |
