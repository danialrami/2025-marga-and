/**
 * One Year of Us - Photo Timeline Generator
 * 
 * This script handles:
 * - Fetching photo list from photos.json
 * - Parsing EXIF DateTimeOriginal using vanilla JavaScript (no external libraries)
 * - Sorting photos by season (Spring, Summer, Autumn, Winter 2025)
 * - Rendering the timeline with seasonal markers
 * - Grouping photos by date into carousels
 * - Dynamic grouping by season, month, week, or day
 * 
 * NOTE: Reverse geocoding/GPS location display is OUT OF SCOPE for now.
 */

const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];

// Global state
let allPhotos = [];
let currentGroupBy = 'week';
let sortedPhotosBySeason = null;

// Inline photo data (generated during build for file:// compatibility)
const INLINE_PHOTOS_METADATA = typeof PHOTOS_METADATA !== 'undefined' ? PHOTOS_METADATA : null;

const seasonsConfig = [
  {
    name: 'Spring',
    year: 2025,
    start: new Date('2025-03-20T00:00:00'),
    end: new Date('2025-06-20T23:59:59'),
    emoji: '🌸',
    dateTaken: new Date('2025-03-20T00:00:00')
  },
  {
    name: 'Summer',
    year: 2025,
    start: new Date('2025-06-21T00:00:00'),
    end: new Date('2025-09-22T23:59:59'),
    emoji: '☀️',
    dateTaken: new Date('2025-06-21T00:00:00')
  },
  {
    name: 'Autumn',
    year: 2025,
    start: new Date('2025-09-23T00:00:00'),
    end: new Date('2025-12-21T23:59:59'),
    emoji: '🍂',
    dateTaken: new Date('2025-09-23T00:00:00')
  },
  {
    name: 'Winter',
    year: '2025-2026',
    start: new Date('2025-12-22T00:00:00'),
    end: new Date('2026-03-19T23:59:59'),
    emoji: '❄️',
    dateTaken: new Date('2025-12-22T00:00:00')
  }
];

function parseDateFromFilename(filename) {
  const name = filename.toUpperCase();
  
  const patterns = [
    /IMG_\d+_(\d{8})(\d{6})/,      
    /PXL_(\d{8})_(\d{9})/,         
    /IMG_(\d{8})_(\d{6})/,         
    /(\d{4})(\d{2})(\d{2})[_\.]/,  
  ];
  
  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      const [, datePart, timePart] = match;
      const year = parseInt(datePart.substring(0, 4), 10);
      const month = parseInt(datePart.substring(4, 6), 10) - 1;
      const day = parseInt(datePart.substring(6, 8), 10);
      
      let hours = 12, minutes = 0, seconds = 0;
      if (timePart) {
        hours = parseInt(timePart.substring(0, 2) || '12', 10);
        minutes = parseInt(timePart.substring(2, 4) || '0', 10);
        seconds = parseInt(timePart.substring(4, 6) || '0', 10);
      }
      
      const date = new Date(year, month, day, hours, minutes, seconds);
      if (!isNaN(date.getTime()) && year >= 2000 && year <= 2030) {
        return date;
      }
    }
  }
  
  return null;
}

const EXIF_TAGS = {
  DateTimeOriginal: 36867,
  SubIFDOffset: 34665
};

class ExifParser {
  constructor(arrayBuffer) {
    this.dataView = new DataView(arrayBuffer);
    this.littleEndian = true;
  }

  getUint8(offset) {
    return this.dataView.getUint8(offset);
  }

  getUint16(offset) {
    return this.dataView.getUint16(offset, this.littleEndian);
  }

  getUint32(offset) {
    return this.dataView.getUint32(offset, this.littleEndian);
  }

  getString(offset, length) {
    let str = '';
    for (let i = 0; i < length; i++) {
      const charCode = this.getUint8(offset + i);
      if (charCode === 0) break;
      str += String.fromCharCode(charCode);
    }
    return str;
  }

  parse() {
    if (this.getUint8(0) !== 0xFF || this.getUint8(1) !== 0xD8) {
      return null;
    }

    let offset = 2;
    const length = this.dataView.byteLength;

    while (offset < length) {
      if (this.getUint8(offset) !== 0xFF) {
        offset++;
        continue;
      }

      const marker = this.getUint8(offset + 1);

      if (marker === 0xE1) {
        return this.parseExifApp1(offset + 4);
      }

      if (marker === 0xD9 || marker === 0xDA) {
        break;
      }

      const segmentLength = this.getUint16(offset + 2);
      offset += 2 + segmentLength;
    }

    return null;
  }

  parseExifApp1(offset) {
    const exifSignature = this.getString(offset, 4);
    
    if (exifSignature !== 'Exif') {
      return null;
    }

    offset += 6;

    if (this.getUint16(offset) !== 0x002A) {
      return null;
    }

    const tiffHeaderOffset = this.getUint32(offset + 2);
    offset += tiffHeaderOffset;

    return this.parseIFD(offset);
  }

  parseIFD(offset) {
    const numEntries = this.getUint16(offset);
    offset += 2;

    for (let i = 0; i < numEntries; i++) {
      const tag = this.getUint16(offset);
      const type = this.getUint16(offset + 2);
      const count = this.getUint32(offset + 4);
      const valueOffset = offset + 8;

      if (tag === EXIF_TAGS.DateTimeOriginal) {
        if (type === 2) {
          const dateStr = this.readStringValue(valueOffset, count);
          return { dateTaken: this.parseExifDate(dateStr) };
        }
      }

      if (tag === EXIF_TAGS.SubIFDOffset) {
        const subIFDOffset = this.getUint32(valueOffset);
        const subTags = this.parseIFD(offset - 4 + subIFDOffset);
        if (subTags && subTags.dateTaken) {
          return subTags;
        }
      }

      offset += 12;
    }

    return {};
  }

  readStringValue(offset, length) {
    let str = '';
    for (let i = 0; i < length; i++) {
      const charCode = this.getUint8(offset + i);
      if (charCode === 0) break;
      str += String.fromCharCode(charCode);
    }
    return str;
  }

  parseExifDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
      return null;
    }

    const parts = dateStr.split(/[:\s]/);
    if (parts.length < 6) {
      return null;
    }

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const hours = parseInt(parts[3], 10);
    const minutes = parseInt(parts[4], 10);
    const seconds = parseInt(parts[5], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return null;
    }

    return new Date(year, month, day, hours || 0, minutes || 0, seconds || 0);
  }
}

function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

function isHeicFile(filename) {
  const ext = getFileExtension(filename);
  return ext === 'heic' || ext === 'heif';
}

function checkImageSupport(filename) {
  if (isHeicFile(filename)) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    return new Promise((resolve) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        resolve(true);
      };
      img.onerror = () => resolve(false);
      img.src = `data:image/heic;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlNGUwZTAiLz48L3N2Zz4=`;
    });
  }
  return Promise.resolve(true);
}

async function fetchPhotos() {
  try {
    const response = await fetch('photos/photos.json');
    
    if (!response.ok) {
      throw new Error(`photos.json not found (HTTP ${response.status})`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data.photos)) {
      throw new Error('photos.json should contain a "photos" array');
    }
    
    return data.photos;
  } catch (error) {
    console.error('Error fetching photos:', error.message);
    showError(`Unable to load photos. Please ensure photos/photos.json exists with a list of photo filenames. Error: ${error.message}`);
    return [];
  }
}

async function parseEXIFData(imageUrl, filename) {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = async function() {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 1.0));
        const arrayBuffer = await blob.arrayBuffer();

        const exifParser = new ExifParser(arrayBuffer);
        const exifData = exifParser.parse();

        const dateTaken = exifData?.dateTaken || parseDateFromFilename(filename);

        resolve({
          dateTaken: dateTaken,
          latitude: null,
          longitude: null,
          supported: true
        });
      } catch (error) {
        console.warn('EXIF parsing failed for', imageUrl, error);
        resolve({
          dateTaken: parseDateFromFilename(filename),
          latitude: null,
          longitude: null,
          supported: true
        });
      }
    };

    img.onerror = function() {
      console.warn('Failed to load image:', imageUrl);
      resolve({
        dateTaken: parseDateFromFilename(filename),
        latitude: null,
        longitude: null,
        supported: false,
        unsupportedReason: isHeicFile(filename) ? 'HEIC' : null
      });
    };

    img.src = imageUrl;
  });
}

async function geocodeLocation(lat, lng) {
  return '';
}

function getDateKey(date) {
  if (!date) return 'unknown';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getWeekKey(date) {
  if (!date) return 'unknown';
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMonthKey(date) {
  if (!date) return 'unknown';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getSeasonKey(date) {
  if (!date) return 'unknown';
  for (const config of seasonsConfig) {
    if (date >= config.start && date <= config.end) {
      return `${config.name} ${config.year}`;
    }
  }
  if (date < new Date('2025-03-20')) return 'Before 2025';
  if (date > new Date('2026-03-19')) return 'After Winter 2026';
  return 'unknown';
}

function formatGroupKey(groupBy, key, photos) {
  if (key === 'unknown') {
    return `Date unknown (${photos.length} photos)`;
  }
  
  switch (groupBy) {
    case 'day': {
      const date = new Date(key + 'T12:00:00');
      return formatDate(date);
    }
    case 'week': {
      const date = new Date(key + 'T12:00:00');
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 6);
      const startMonth = date.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
      if (startMonth === endMonth) {
        return `${startMonth} ${date.getDate()} - ${endDate.getDate()}`;
      }
      return `${startMonth} ${date.getDate()} - ${endMonth} ${endDate.getDate()}`;
    }
    case 'month': {
      const date = new Date(key + '-01T12:00:00');
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    case 'season': {
      return key;
    }
    default:
      return key;
  }
}

function categorizePhotoBySeason(photosArray) {
  const categorized = {
    Spring: [],
    Summer: [],
    Autumn: [],
    Winter: [],
    Unknown: []
  };

  photosArray.forEach(photo => {
    let season = 'Unknown';

    for (const config of seasonsConfig) {
      if (photo.dateTaken && photo.dateTaken >= config.start && photo.dateTaken <= config.end) {
        season = config.name;
        break;
      }
    }

    categorized[season].push(photo);
  });

  Object.keys(categorized).forEach(key => {
    categorized[key].sort((a, b) => {
      if (!a.dateTaken && !b.dateTaken) return 0;
      if (!a.dateTaken) return 1;
      if (!b.dateTaken) return -1;
      return a.dateTaken - b.dateTaken;
    });
  });

  return categorized;
}

function groupPhotos(photos, groupBy) {
  const groups = {};
  const getKey = groupBy === 'day' ? getDateKey : 
                 groupBy === 'week' ? getWeekKey :
                 groupBy === 'month' ? getMonthKey :
                 getSeasonKey;
  
  photos.forEach(photo => {
    const key = getKey(photo.dateTaken);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(photo);
  });
  
  return groups;
}

function groupPhotosByDate(photos) {
  const groups = {};
  
  photos.forEach(photo => {
    const dateKey = getDateKey(photo.dateTaken);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(photo);
  });
  
  return groups;
}

function formatDate(date) {
  if (!date) return 'Date unknown';

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  return `${month} ${day}, ${year}`;
}

function createPhotoStrip(photoGroup, dateStr, customLabel) {
  const container = document.createElement('div');
  container.className = 'photo-card photo-carousel-card';

  const caption = document.createElement('div');
  caption.className = 'photo-caption';
  
  const dateSpan = document.createElement('span');
  dateSpan.className = 'photo-date';
  dateSpan.textContent = customLabel || formatDate(dateStr);
  
  if (photoGroup.length > 1) {
    const countSpan = document.createElement('span');
    countSpan.className = 'photo-count';
    countSpan.textContent = ` (${photoGroup.length} photos)`;
    caption.appendChild(dateSpan);
    caption.appendChild(countSpan);
  } else {
    caption.appendChild(dateSpan);
  }

  const carouselWrapper = document.createElement('div');
  carouselWrapper.className = 'photo-carousel-wrapper';

  const carousel = document.createElement('div');
  carousel.className = 'photo-carousel';

  photoGroup.forEach((photo, index) => {
    const slide = document.createElement('div');
    slide.className = 'photo-carousel-slide';
    slide.dataset.index = index;

    const img = document.createElement('img');
    img.src = photo.filename;
    img.alt = `Photo from ${customLabel || formatDate(dateStr)}`;
    img.className = 'photo-carousel-img';

    if (!photo.supported) {
      const unsupportedMsg = document.createElement('div');
      unsupportedMsg.className = 'unsupported-format';
      unsupportedMsg.textContent = 'Unsupported format';
      slide.appendChild(unsupportedMsg);
    } else {
      slide.appendChild(img);
    }

    carousel.appendChild(slide);
  });

  if (photoGroup.length > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.className = 'photo-carousel-btn photo-carousel-btn-prev';
    prevBtn.textContent = '◀';
    prevBtn.setAttribute('aria-label', 'Previous photo');
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'photo-carousel-btn photo-carousel-btn-next';
    nextBtn.textContent = '▶';
    nextBtn.setAttribute('aria-label', 'Next photo');

    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'photo-carousel-dots';
    photoGroup.forEach((_, index) => {
      const dot = document.createElement('span');
      dot.className = `photo-carousel-dot${index === 0 ? ' active' : ''}`;
      dot.dataset.index = index;
      dot.addEventListener('click', () => {
        const slides = carousel.querySelectorAll('.photo-carousel-slide');
        const targetIndex = parseInt(dot.dataset.index);
        scrollToSlideByIndex(carousel, slides[targetIndex]);
      });
      dotsContainer.appendChild(dot);
    });

    prevBtn.addEventListener('click', () => {
      scrollToSlide(carousel, -1);
      updateDotsAfterScroll(carousel);
    });
    nextBtn.addEventListener('click', () => {
      scrollToSlide(carousel, 1);
      updateDotsAfterScroll(carousel);
    });

    carouselWrapper.appendChild(prevBtn);
    carouselWrapper.appendChild(carousel);
    carouselWrapper.appendChild(nextBtn);
    carouselWrapper.appendChild(dotsContainer);

    let scrollTimeout;
    carousel.addEventListener('scroll', () => {
      updateActiveDot(carousel, dotsContainer.querySelectorAll('.photo-carousel-dot'));
    });
  } else {
    carouselWrapper.appendChild(carousel);
  }

  container.appendChild(carouselWrapper);
  container.appendChild(caption);

  return container;
}

function scrollToSlide(carousel, direction) {
  const slides = carousel.querySelectorAll('.photo-carousel-slide');
  const currentIndex = getCurrentSlideIndex(carousel);
  const newIndex = Math.max(0, Math.min(slides.length - 1, currentIndex + direction));
  
  scrollToSlideByIndex(carousel, slides[newIndex]);
}

function scrollToSlideByIndex(carousel, targetSlide) {
  const targetIndex = parseInt(targetSlide.dataset.index || 
    [...carousel.querySelectorAll('.photo-carousel-slide')].indexOf(targetSlide));
  
  const slides = carousel.querySelectorAll('.photo-carousel-slide');
  const slideWidth = slides[0].offsetWidth;
  const padding = 40;
  const effectiveSlideWidth = slideWidth - padding * 2;
  const scrollLeft = targetIndex * effectiveSlideWidth;
  
  carousel.scrollTo({
    left: scrollLeft,
    behavior: 'smooth'
  });
  
  updateDotsAfterScroll(carousel);
}

function getCurrentSlideIndex(carousel) {
  const slides = carousel.querySelectorAll('.photo-carousel-slide');
  const scrollLeft = carousel.scrollLeft;
  const slideWidth = slides[0]?.offsetWidth || 0;
  const padding = 40;
  const effectiveSlideWidth = slideWidth - padding * 2;
  
  return Math.round(scrollLeft / effectiveSlideWidth);
}

function updateDotsAfterScroll(carousel) {
  const dotsContainer = carousel.parentElement?.querySelector('.photo-carousel-dots');
  if (!dotsContainer) return;
  
  const dots = dotsContainer.querySelectorAll('.photo-carousel-dot');
  const currentIndex = getCurrentSlideIndex(carousel);
  
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === currentIndex);
  });
}

function updateActiveDot(carousel, dots) {
  const currentIndex = getCurrentSlideIndex(carousel);
  
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === currentIndex);
  });
}

function enableTouchSwipe(carouselWrapper, carousel) {
  let touchStartX = 0;
  let touchEndX = 0;
  const minSwipeDistance = 50;

  const handleTouchStart = (e) => {
    touchStartX = e.changedTouches[0].screenX;
    carouselWrapper.classList.add('swiping');
  };

  const handleTouchMove = (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    carouselWrapper.style.setProperty('--swipe-offset', `${diff}px`);
  };

  const handleTouchEnd = () => {
    const diff = touchStartX - touchEndX;
    const distance = Math.abs(diff);

    if (distance > minSwipeDistance) {
      if (diff > 0) {
        navigateCarousel(carousel, 1);
      } else {
        navigateCarousel(carousel, -1);
      }
    }

    carouselWrapper.classList.remove('swiping');
    carouselWrapper.style.removeProperty('--swipe-offset');
  };

  carouselWrapper.addEventListener('touchstart', handleTouchStart, { passive: true });
  carouselWrapper.addEventListener('touchmove', handleTouchMove, { passive: true });
  carouselWrapper.addEventListener('touchend', handleTouchEnd, { passive: true });
}

function renderTimeline(sortedPhotos, groupBy = 'week') {
  const main = document.getElementById('timeline');
  const loading = document.getElementById('loading');

  if (loading) {
    loading.style.display = 'none';
  }

  renderMasterTimeline(sortedPhotos);

  if (groupBy === 'season') {
    seasonsConfig.forEach(season => {
      const header = document.createElement('h2');
      header.className = 'season-marker';
      header.id = `season-${season.name.toLowerCase()}`;
      header.textContent = `${season.name} ${season.year}`;
      main.appendChild(header);

      const photos = sortedPhotos[season.name];

      if (photos.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'empty-season';
        emptyMsg.textContent = `No photos yet for ${season.name}...`;
        main.appendChild(emptyMsg);
        return;
      }

      const photoStrip = createPhotoStrip(photos, season.dateTaken);
      main.appendChild(photoStrip);
    });
  } else {
    const allPhotos = [];
    seasonsConfig.forEach(season => {
      allPhotos.push(...sortedPhotos[season.name]);
    });

    const photoGroups = groupPhotos(allPhotos, groupBy);
    const sortedKeys = Object.keys(photoGroups).sort((a, b) => {
      if (a === 'unknown') return 1;
      if (b === 'unknown') return -1;
      return a.localeCompare(b);
    });

    let currentSeason = null;
    sortedKeys.forEach(key => {
      if (groupBy !== 'season') {
        const photos = photoGroups[key];
        if (photos.length === 0) return;
        
        const firstPhoto = photos[0];
        let seasonName = null;
        for (const config of seasonsConfig) {
          if (firstPhoto.dateTaken && firstPhoto.dateTaken >= config.start && firstPhoto.dateTaken <= config.end) {
            seasonName = config.name;
            break;
          }
        }

        if (seasonName && seasonName !== currentSeason) {
          currentSeason = seasonName;
          const config = seasonsConfig.find(s => s.name === seasonName);
          const header = document.createElement('h2');
          header.className = 'season-marker';
          header.id = `season-${seasonName.toLowerCase()}`;
          header.textContent = `${config.emoji} ${config.name} ${config.year}`;
          main.appendChild(header);
        }
      }

      const photos = photoGroups[key];
      const groupDate = key === 'unknown' ? null : new Date(key + 'T12:00:00');
      const photoStrip = createPhotoStrip(photos, groupDate, formatGroupKey(groupBy, key, photos));
      main.appendChild(photoStrip);
    });
  }

  setupScrollTracking();
}

function renderTimelineDynamic(groupBy) {
  currentGroupBy = groupBy;
  
  const viewControls = document.getElementById('view-controls');
  if (viewControls) {
    viewControls.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.group === groupBy);
    });
  }
  
  const main = document.getElementById('timeline');
  
  const existingContent = main.querySelectorAll('.season-marker, .photo-card, .empty-season');
  existingContent.forEach(el => main.removeChild(el));
  
  if (sortedPhotosBySeason) {
    renderTimeline(sortedPhotosBySeason, groupBy);
  }
}

function renderMasterTimeline(sortedPhotos) {
  const container = document.getElementById('master-timeline-markers');
  if (!container) return;

  container.innerHTML = '';

  seasonsConfig.forEach((season, index) => {
    const photos = sortedPhotos[season.name];
    const hasPhotos = photos.length > 0;

    const marker = document.createElement('div');
    marker.className = `master-timeline-marker${hasPhotos ? ' has-photos' : ''}`;
    marker.dataset.season = season.name;

    const dot = document.createElement('div');
    dot.className = 'master-timeline-marker-dot';

    const label = document.createElement('span');
    label.className = 'master-timeline-marker-label';
    label.textContent = `${season.emoji} ${season.name}`;

    marker.appendChild(dot);
    marker.appendChild(label);

    marker.addEventListener('click', () => {
      const header = document.getElementById(`season-${season.name.toLowerCase()}`);
      if (header) {
        header.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    container.appendChild(marker);
  });

  updateMobileNav(sortedPhotos);
}

function updateMobileNav(sortedPhotos) {
  const mobileNav = document.getElementById('mobile-season-nav');
  if (!mobileNav) return;

  seasonsConfig.forEach(season => {
    const btn = mobileNav.querySelector(`[data-season="${season.name}"]`);
    if (!btn) return;

    const hasPhotos = sortedPhotos[season.name].length > 0;
    btn.classList.toggle('has-photos', hasPhotos);
  });
}

function setupScrollTracking() {
  const progressBar = document.getElementById('master-timeline-progress');
  const markers = document.querySelectorAll('.master-timeline-marker');
  const mobileNav = document.getElementById('mobile-season-nav');
  const mobileBtns = mobileNav ? mobileNav.querySelectorAll('.mobile-season-btn') : [];
  const seasonHeaders = {};

  seasonsConfig.forEach(season => {
    const header = document.getElementById(`season-${season.name.toLowerCase()}`);
    if (header) {
      seasonHeaders[season.name] = header;
    }
  });

  mobileBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const season = btn.dataset.season;
      const header = document.getElementById(`season-${season.toLowerCase()}`);
      if (header) {
        header.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  function updateMasterTimeline() {
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight - windowHeight;
    const scrollPercent = Math.min(100, Math.max(0, (scrollTop / docHeight) * 100));

    if (progressBar) {
      progressBar.style.height = `${scrollPercent}%`;
    }

    let currentSeason = null;
    for (const [seasonName, header] of Object.entries(seasonHeaders)) {
      const rect = header.getBoundingClientRect();
      if (rect.top < windowHeight / 2) {
        currentSeason = seasonName;
      }
    }

    markers.forEach(marker => {
      marker.classList.toggle('active', marker.dataset.season === currentSeason);
    });

    mobileBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.season === currentSeason);
    });
  }

  window.addEventListener('scroll', updateMasterTimeline, { passive: true });
  updateMasterTimeline();
}

function showError(message) {
  const errorDiv = document.getElementById('error-message');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }

  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.display = 'none';
  }
}

async function init() {
  const loading = document.getElementById('loading');
  
  if (loading) {
    loading.querySelector('p').textContent = 'Loading our memories...';
  }

  let photosWithData = [];

  // Try inline data first (generated during build for file:// compatibility)
  if (typeof PHOTOS_METADATA !== 'undefined' && PHOTOS_METADATA && PHOTOS_METADATA.photos) {
    photosWithData = PHOTOS_METADATA.photos.map(p => ({
      filename: `photos/${p.filename}`,
      dateTaken: p.dateTaken ? new Date(p.dateTaken) : null,
      dateFormatted: p.dateFormatted,
      location: '',
      supported: true
    }));
    console.log(`Loaded ${photosWithData.length} photos from inline metadata`);
  } else {
    // Fallback to fetch for development server
    try {
      const response = await fetch('photos/photos-metadata.json');
      if (response.ok) {
        const metadata = await response.json();
        photosWithData = metadata.photos.map(p => ({
          filename: `photos/${p.filename}`,
          dateTaken: p.dateTaken ? new Date(p.dateTaken) : null,
          dateFormatted: p.dateFormatted,
          location: '',
          supported: true
        }));
        console.log(`Loaded ${photosWithData.length} photos from pre-generated metadata`);
      } else {
        throw new Error('Metadata not found');
      }
    } catch (e) {
      console.warn('Pre-generated metadata not found, falling back to client-side parsing:', e.message);
      
      const photoFilenames = await fetchPhotos();

      if (photoFilenames.length === 0) {
        if (loading) {
          loading.style.display = 'none';
        }
        showError('Unable to load photos. Please ensure photos/photos-metadata.json exists or run ./build.sh');
        return;
      }

      if (loading) {
        loading.querySelector('p').textContent = 'Processing photos...';
      }

      for (const filename of photoFilenames) {
        const photoPath = `photos/${filename}`;
        
        const exifData = await parseEXIFData(photoPath, filename);

        let location = '';
        if (exifData.latitude && exifData.longitude) {
          location = await geocodeLocation(exifData.latitude, exifData.longitude);
        }

        photosWithData.push({
          filename: photoPath,
          dateTaken: exifData.dateTaken,
          location: location,
          supported: exifData.supported !== false,
          unsupportedReason: exifData.unsupportedReason
        });
      }
    }
  }

  const sortedPhotos = categorizePhotoBySeason(photosWithData);
  allPhotos = photosWithData;
  sortedPhotosBySeason = sortedPhotos;

  setupViewControls();
  renderTimeline(sortedPhotos, currentGroupBy);
}

function setupViewControls() {
  const viewControls = document.getElementById('view-controls');
  if (!viewControls) return;

  viewControls.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const groupBy = btn.dataset.group;
      renderTimelineDynamic(groupBy);
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
