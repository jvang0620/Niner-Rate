'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Navbar from '@/components/navbar';
import { useSession } from 'next-auth/react';
import Pagination from '@/components/pagination';
import ConfirmModal from '@/components/confirmModal';

import { StarFilledIcon, StarIcon } from '@radix-ui/react-icons';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import LikeButton from '@/components/LikeButton';

interface Course {
  _id: string;
  code: string;
  title: string;
  courseDescription: string;
  unccCatalogID: string;
  unccCourseID: string;
}

interface Review {
  _id: string;
  rating: number;
  review: string;
  studentName: string;
  createdAt: string;
  instructorName: string;
}

export default function CoursePage() {
  const [course, setCourse] = useState<Course | null>(null);
  const [searchParams] = useSearchParams();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('description');
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [savedCourses, setSavedCourses] = useState<string[]>([]);
  const [isCourseSaved, setIsCourseSaved] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const ITEMS_PER_PAGE = 5;

  // Variables to manage the visibility of the modal and the course to delete
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);

  const totalPages = Math.ceil(reviews.length / ITEMS_PER_PAGE);
  const displayReviews = reviews.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Functions to handle the confirmation modal actions: confirm and cancel
  const handleConfirmDelete = () => {
    if (courseToDelete) {
      handleDeleteCourse(courseToDelete);
    }
    setShowConfirmModal(false);
    setCourseToDelete(null);
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setCourseToDelete(null);
  };

  const handleSaveOrDeleteCourse = async (courseCode, isSaved) => {
    try {
      const method = isSaved ? 'DELETE' : 'POST';
      const response = await fetch(`/api/savedCourses/${userId}`, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseCode }),
      });

      if (!response.ok) {
        throw new Error('Failed to modify saved courses');
      }

      const updatedCourses = await response.json();
      setSavedCourses(updatedCourses);
      setIsCourseSaved(!isSaved);
    } catch (error) {
      console.error(`Error ${isSaved ? 'deleting' : 'saving'} course:`, error);
    }
  };

  useEffect(() => {
    // Assuming your URL structure is /courses/{id}
    const courseId = pathname.split('/')[2]; // Adjust based on your actual URL structure
    // Alternatively, if you have the ID in search parameters: const courseId = searchParams.get('id');

    const fetchData = async () => {
      if (!courseId) return;
      try {
        const response = await fetch(`/api/courses/${courseId}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        setCourse(data.course);
        setReviews(data.reviews);
      } catch (error) {
        console.error('Failed to fetch course:', error);
      }
    };

    fetchData();
  }, [pathname]); // Depend on pathname to refetch when it changes

  useEffect(() => {
    const fetchSavedCourses = async () => {
      if (!userId) return;
      try {
        const response = await fetch(`/api/savedCourses/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch saved courses');
        const courses = await response.json();
        const courseCodes = courses.map(
          (course: { code: string }) => course.code
        );
        setSavedCourses(courseCodes);
        setIsCourseSaved(courseCodes.includes(course?.code ?? ''));
      } catch (error) {
        console.error('Failed to fetch saved courses:', error);
      }
    };

    fetchSavedCourses();
  }, [userId, course?.code]);

  const handleUpdateCourse = async (event) => {
    event.preventDefault();
    const courseId = pathname.split('/')[2];
    const formData = new FormData(event.target);
    const updatedCourseData = Object.fromEntries(formData.entries());

    fetch(`/api/courses/${courseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedCourseData),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          alert(`Failed: ${data.message}`);
        } else {
          alert('Course updated successfully!');
          if (course) {
            const updatedData = Object.fromEntries(
              Object.entries(updatedCourseData).map(([key, value]) => [
                key,
                String(value),
              ])
            );
            setCourse({
              ...course,
              ...updatedData,
              _id: course._id,
              code: updatedData.code || '',
            });
          }
          setShowUpdateForm(false);
        }
      })
      .catch((error) => console.error('Error updating course:', error));
  };

  // delete course by id
  const handleDeleteCourse = async (courseId) => {
    try {

      const deleteReviewsResponse = await fetch(`/api/review/${courseId}`, {
        method: 'DELETE',
      });
      if (!deleteReviewsResponse.ok) {
        throw new Error('Failed to delete reviews');
      }


      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete course');
      }
      alert('Course deleted successfully');
      // Redirect to the courses page
      window.location.href = '/courses';
    } catch (error) {
      console.error('Failed to delete course:', error);
    }
  };

  const overallRating =
    reviews.length > 0
      ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
      : 0;

  if (!course) return <div>Loading...</div>;

  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center  min-h-screen bg-gray-100 dark:bg-gray-900">
        <main className="mt-20 py-8 px-4 w-full max-w-3xl">
          <div className="grid grid-cols-1 gap-6">
            <div className="p-8 bg-white rounded-lg shadow-md">
              <h2 className="text-2xl font-bold text-[#005035] mb-4">
                {course.code + ': ' + course.title}
              </h2>

              {session && (
                <button
                  onClick={() => {
                    if (
                      !isCourseSaved ||
                      window.confirm(
                        'Are you sure you want to delete this course from your Saved Courses?'
                      )
                    ) {
                      handleSaveOrDeleteCourse(course.code, isCourseSaved);
                    }
                  }}
                  style={{ marginRight: '10px' }}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${
                    isCourseSaved
                      ? 'btn-delete hover:bg-b71c1c'
                      : 'btn-save hover:bg-003e2d'
                  }`}
                >
                  {isCourseSaved ? 'Delete Course' : 'Save Course'}
                </button>
              )}

              {session?.user?.id === 'admin' && (
                <button
                  onClick={() => {
                    setCourseToDelete(course._id); // Set the course ID to delete
                    setShowConfirmModal(true); // Show the confirmation modal
                  }}
                  style={{ marginRight: '10px' }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                >
                  Delete Course From DB
                </button>
              )}

              {session?.user?.id === 'admin' && (
                <button
                  onClick={() => setShowUpdateForm(!showUpdateForm)}
                  className={`btn ${
                    showUpdateForm
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-blue-500 hover:bg-blue-600'
                  } mb-4`}
                >
                  {showUpdateForm ? 'Cancel Edit' : 'Edit Course'}
                </button>
              )}

              <div className="flex items-center mb-2">
                <span className="text-md font-medium  mr-1">
                  Course Rating:{' '}
                </span>
                <span className="text-[32px] font-bold text-[#005035]">
                  {overallRating.toFixed(1)}
                </span>
                <span className="text-md font-bold mr-1 text-gray-500">/5</span>
                <div className="flex items-center ml-2">
                  {[...Array(5)].map((_, i) =>
                    i < overallRating ? (
                      <StarFilledIcon
                        key={i}
                        className="w-5 h-5 text-[#A49665]"
                      />
                    ) : (
                      <StarIcon key={i} className="w-4 h-4 text-[#A49665]" />
                    )
                  )}
                </div>
              </div>
              <div className="text-md ">
                Based on <span className="font-bold">{reviews.length}</span>{' '}
                reviews
              </div>
              <div className="mt-6 mb-6">
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuLink
                        onClick={() => setActiveTab('description')}
                        className={`group inline-flex h-9 w-max items-center justify-center rounded-md  px-4 py-2 text-sm font-medium transition-colors ${
                          activeTab === 'description'
                            ? 'bg-gray-500 text-white'
                            : 'hover:bg-gray-100 hover:text-gray-900'
                        }`}
                        href="#"
                      >
                        Description
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <NavigationMenuLink
                        onClick={() => setActiveTab('reviews')}
                        className={`group inline-flex h-9 w-max items-center justify-center rounded-md  px-4 py-2 text-sm font-medium transition-colors ${
                          activeTab === 'reviews'
                            ? 'bg-gray-500 text-white'
                            : 'hover:bg-gray-100 hover:text-gray-900'
                        }`}
                        href="#"
                      >
                        Reviews
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
              </div>
              {activeTab === 'description' && (
                <p className="text-base text-gray-700 dark:text-gray-300 mt-4 leading-7">
                  {course.courseDescription}
                </p>
              )}
              {activeTab === 'reviews' && (
                <div className="p-4">
                  {displayReviews.map((review) => {
                    const date = new Date(review.createdAt);
                    const formattedDate = date.toLocaleDateString();
                    return (
                      <div
                        key={review._id}
                        className="border bg-gray-100 border-gray-300 rounded-md mb-4 p-4"
                      >
                        <div className="flex items-center mb-2">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center">
                              <span className="text-[25px] font-bold mr-1">
                                {review.rating}
                              </span>
                              <span className="text-sm mr-2">/5</span>
                              {[...Array(5)].map((_, i) =>
                                i < review.rating ? (
                                  <StarFilledIcon
                                    key={i}
                                    className="w-5 h-5 text-[#A49665]"
                                  />
                                ) : (
                                  <StarIcon
                                    key={i}
                                    className="w-4 h-4 text-[#A49665]"
                                  />
                                )
                              )}
                              {review.instructorName && (
                                <span className=" mx-7 text-sm  text-gray-500">
                                  Professor: {review.instructorName}
                                </span>
                              )}
                            </div>

                            <div>
                              <span className="text-sm text-gray-500">
                                {formattedDate}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-sm font-medium">
                          {review.studentName}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                          {review.review}
                        </p>
                        <LikeButton reviewId = {review._id} />
                      </div>
                    );
                  })}
                  <Pagination
                    totalPages={totalPages}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}

              {/* Display update form only for admin */}
              {showUpdateForm && (
                <form onSubmit={handleUpdateCourse} className="mt-6">
                  <div className="space-y-4">
                    <label>
                      <strong>Course Code:</strong>
                      <input
                        defaultValue={course.code}
                        name="code"
                        placeholder="Course Code"
                        required
                        className="input-field"
                      />
                    </label>

                    <br></br>

                    <label>
                      <strong>Course Title:</strong>
                      <input
                        defaultValue={course.title}
                        name="title"
                        placeholder="Title"
                        required
                        className="input-field"
                      />
                    </label>

                    <br></br>

                    <label>
                      <strong>Course Description:</strong>
                      <textarea
                        defaultValue={course.courseDescription}
                        name="courseDescription"
                        placeholder="Course Description"
                        required
                        className="input-field h-32"
                      />
                    </label>

                    <br></br>

                    <label>
                      <strong>UNCC Catalog ID:</strong>
                      <input
                        defaultValue={course.unccCatalogID}
                        name="unccCatalogID"
                        placeholder="Catalog ID"
                        required
                        className="input-field"
                      />
                    </label>

                    <br></br>

                    <label>
                      <strong>UNCC Course ID:</strong>
                      <input
                        defaultValue={course.unccCourseID}
                        name="unccCourseID"
                        placeholder="Course ID"
                        required
                        className="input-field"
                      />
                    </label>

                    <br></br>

                    <button type="submit" className="btn btn-primary">
                      {' '}
                      Update Course{' '}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </main>
      </div>
      {showConfirmModal && (
        <ConfirmModal
          message={`Are you sure you want to delete "${
            course.code + ': ' + course.title
          }" from the data base?`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </>
  );
}
