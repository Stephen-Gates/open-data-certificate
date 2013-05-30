class SurveySection < ActiveRecord::Base
  unloadable
  include Surveyor::Models::SurveySectionMethods

  attr_accessible :display_header

  def questions_for_certificate(response_set)
    questions.where(:display_on_certificate => true)
             .select {|q| q.triggered? response_set }
  end

end