let restaurant;
var map;

/**
 * Skip links logic
 */
const skipLink = document.getElementById('skip-link');

skipLink.addEventListener('click', (e) => {
  document.getElementById('restaurant-name').focus();
});

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      document.querySelector('#map-button').addEventListener('click', () => {
        self.map = new google.maps.Map(document.getElementById('map'), {
          zoom: 16,
          center: restaurant.latlng,
          scrollwheel: false
        });
        document.querySelector('.map-button-container').style.display = 'none';
        DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
      });
      fillBreadcrumb();
    }
  });
}

window.addEventListener('online', () => {
  DBHelper.sendCachedRequests();
});

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant);
      toggleIsFavorite();
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;
  name.dataset.id = restaurant.id;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.setAttribute('alt', `Restaurant ${restaurant.name}`);
  image.srcset = `/img/${restaurant.photograph || restaurant.id}-400.jpg 400w, /img/${restaurant.photograph || restaurant.id}-800.jpg 800w`
  image.src = DBHelper.imageUrlForRestaurant(restaurant);

  const isFavoriteButton = document.createElement('button');
  const setFavoriteIcon = restaurant.is_favorite == 'true' ? 'fas' : 'far';
  isFavoriteButton.setAttribute('aria-label', 'Favorite Restaurant Button');
  isFavoriteButton.id = 'is-favorite-button';
  isFavoriteButton.innerHTML = `
    <span class="fa-stack fa-2x">
      <i class="fas fa-bookmark fa-stack-2x"></i>
      <i class="${setFavoriteIcon} fa-heart fa-stack-1x fa-inverse" data-favorite="${restaurant.is_favorite}" data-id="${restaurant.id}"></i>
    </span>
  `;
  document.querySelector('.img-container').append(isFavoriteButton);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }

  // fill reviews
  DBHelper.fetchAllRestaurantReviews(restaurant.id, (error, reviews) => {
    if (error) {
      console.error(error);
    } else {
      fillReviewsHTML(reviews);
    }
  }); // end of fetching reviews for this restaurant
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const header = document.getElementById('reviews-header');
  const title = document.createElement('h2');
  const button = document.createElement('button');
  button.setAttribute('aria-label', 'Create New Review');
  button.innerHTML = 'Add Review';
  button.id='add-review';

  title.innerHTML = 'Reviews';
  header.appendChild(title);
  header.appendChild(button);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);

  formEvents();
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.id = `review-${review.id}`;
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  const createdAt = new Date(review.updatedAt);
  const month = createdAt.toLocaleString('en-us', { month: "long" });
  const day = createdAt.getUTCDate();
  const year = createdAt.getUTCFullYear();

  date.innerHTML = `${month} ${day}, ${year}`
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  const editIcon = document.createElement('span');
  editIcon.classList.add('fas', 'fa-edit');
  editIcon.dataset.id = review.id;
  editIcon.addEventListener('click', e => editReview(e));
  li.appendChild(editIcon);

  const deleteIcon = document.createElement('span');
  deleteIcon.classList.add('far', 'fa-trash-alt');
  deleteIcon.dataset.id = review.id;
  deleteIcon.addEventListener('click', e => deleteReview(e));
  li.appendChild(deleteIcon);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.setAttribute('aria-current', 'page');
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function toggleIsFavorite() {
  const button = document.querySelector('#is-favorite-button');
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
  });
}

const addReview = function() {
  const submitFormButton = document.querySelector('#submit-form');

  submitFormButton.dataset.editing = false;
  resetForm();
  showForm();
}

const editReview = function(e) {
  const id = e.target.dataset.id; /** Set on edit icon click */
  const name = document.querySelector('#user-name');
  const rating = document.querySelector('#rating');
  const comments = document.querySelector('#user-comments');
  const submitFormButton = document.querySelector('#submit-form');

  submitFormButton.dataset.editing = true;
  showForm();

  /** Take values from desired comment and populate the comment form for editing */
  name.value = e.target.parentElement.children[0].innerText;
  name.dataset.id = id;
  comments.value = e.target.parentElement.children[3].innerText;
  rating.value = +e.target.parentElement.children[2].innerText.split(' ')[1];
}

const submitForm = function(e) {
  const submitFormButton = document.querySelector('#submit-form');
  const name = document.querySelector('#user-name');
  const rating = document.querySelector('#rating');
  const comments = document.querySelector('#user-comments');
  const restaurant = document.querySelector('#restaurant-name');
  const container = document.querySelector('#form-container');
  const ul = document.getElementById('reviews-list');
  const id = name.dataset.id;

  e.preventDefault();

  if(submitFormButton.dataset.editing === 'true') {
    const data = {
      name: name.value,
      rating: +rating.value,
      comments: comments.value
    }

    DBHelper.updateReviewById(id, data, (error, review) => {
      if (error) {
        console.error(error);
      } else {
        const oldReview = document.querySelector(`#review-${id}`);
        oldReview.style.display = 'none';
        ul.appendChild(createReviewHTML(review));
      }
    });
  } else {
    const data = {
      restaurant_id: +restaurant.dataset.id,
      name: name.value,
      rating: +rating.value,
      comments: comments.value,
      createdAt: Date.now()
    }

    DBHelper.addNewReview(data, (error, review) => {
      if (error) {
        console.error(error);
      } else {
        ul.appendChild(createReviewHTML(review));
      }
    });
  }

  container.style.display = 'none';
}

const deleteReview = function(e) {
  DBHelper.deleteReviewById(e.target.dataset.id, (error) => {
    if (error) {
      console.error(error);
    } else {
      e.target.parentElement.style.display = 'none';
    }
  });
}

const resetForm = function(e) {
  const name = document.querySelector('#user-name');
  const rating = document.querySelector('#rating');
  const comments = document.querySelector('#user-comments');
  const container = document.querySelector('#form-container');

  if(e) {
    e.preventDefault();
  };

  container.style.display = 'none';
  name.value = '';
  rating.value = 1;
  comments.value = '';
}

const showForm = function() {
  const name = document.querySelector('#user-name');
  const container = document.querySelector('#form-container');

  container.style.display = 'block';
  name.focus();
}

function formEvents() {
  const addReviewButton = document.querySelector('#add-review');
  const cancelFormButton = document.querySelector('#cancel-form');
  const submitFormButton = document.querySelector('#submit-form');

  cancelFormButton.addEventListener('click', e => resetForm(e));
  addReviewButton.addEventListener('click', e => addReview(e));
  submitFormButton.addEventListener('click', e => submitForm(e));
}
