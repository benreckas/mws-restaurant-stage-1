let restaurants,
    neighborhoods,
    cuisines
var map;
var markers = [];

/**
 * Skip links logic
 */
const skipLink = document.getElementById('skip-link');

skipLink.addEventListener('click', (e) => {
  document.getElementById('filter-header').focus();
});

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  fetchNeighborhoods();
  fetchCuisines();
  loadMap();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

loadMap = () => {
  document.querySelector('#map-button').addEventListener('click', () => {
    let loc = {
      lat: 40.722216,
      lng: -73.987501
    };
    self.map = new google.maps.Map(document.getElementById('map'), {
      zoom: 12,
      center: loc,
      scrollwheel: false
    });
    updateRestaurants();
    document.querySelector('.map-button-container').style.display = 'none';
  });
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
  lazyLoadImages();
  toggleIsFavorite();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.classList = 'restaurant-img lazy-img';
  image.setAttribute('alt', `Restaurant ${restaurant.name}`);
  image.setAttribute('data-src', DBHelper.imageUrlForRestaurant(restaurant));
  image.setAttribute('data-id', restaurant.photograph || restaurant.id);
  li.append(image);

  const isFavoriteButton = document.createElement('button');
  const setFavoriteIcon = restaurant.is_favorite == 'true' ? 'fas' : 'far';
  isFavoriteButton.id = 'is-favorite-button';
  isFavoriteButton.innerHTML = `
    <span class="fa-stack fa-2x">
      <i class="fas fa-bookmark fa-stack-2x"></i>
      <i class="${setFavoriteIcon} fa-heart fa-stack-1x fa-inverse" data-favorite="${restaurant.is_favorite}" data-id="${restaurant.id}"></i>
    </span>
  `;
  li.append(isFavoriteButton);

  const info = document.createElement('div');
  info.className = 'restaurant-info'
  li.append(info);

  const name = document.createElement('h3');
  name.innerHTML = restaurant.name;
  info.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  info.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  info.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.setAttribute('aria-label', restaurant.name);
  info.append(more)

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}

/**
 * Lazy Loading for Images
 */
function preloadImage(image) {
  image.src = image.dataset.src;
  image.srcset = `/img/${image.dataset.id}-400.jpg 400w, /img/${image.dataset.id}-800.jpg 800w`
};

function lazyLoadImages() {
  function onIntersection(entries) {
    // Loop through the entries
    entries.forEach(entry => {
      // Are we in viewport?
      if (entry.intersectionRatio > 0) {
        // Stop watching and load the image
        observer.unobserve(entry.target);
        preloadImage(entry.target);
      }
    });
  }

  const images = document.querySelectorAll('.lazy-img');
  const config = {
    rootMargin: '50px 0px',
    threshold: 0.01
  };

  // The observer for the images on the page
  let observer = new IntersectionObserver(onIntersection, config);
    images.forEach(image => {
      observer.observe(image);
    });
}

function toggleIsFavorite() {
  const buttons = document.querySelectorAll('#is-favorite-button');
  for(button of buttons) {
    button.addEventListener('click', e => {
      if(e.target.dataset.favorite === 'false') {
        e.target.dataset.favorite = 'true';
        e.target.classList.remove('far');
        e.target.classList.add('fas');
        DBHelper.setIsFavorite(true, e.target.dataset.id);
      } else {
        e.target.dataset.favorite = 'false';
        e.target.classList.remove('fas');
        e.target.classList.add('far');
        DBHelper.setIsFavorite(false, e.target.dataset.id);
      };
    })
  };
}